import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chunkText } from "./chunking.ts";
import { generateEmbedding } from "../_shared/embedding.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;

  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

interface KnowledgeDocument {
  title: string;
  source?: string;
  category?: string;
  content: string;
}

interface IngestRequest {
  documents: KnowledgeDocument[];
}

Deno.serve(async (req) => {
  // ------------------------------------------------------------
  // CORS
  // ------------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS_HEADERS,
    });
  }

  // ------------------------------------------------------------
  // POST only
  // ------------------------------------------------------------

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  // ------------------------------------------------------------
  // RAG ingestion token
  // ------------------------------------------------------------

  const ingestToken = Deno.env.get("RAG_INGEST_TOKEN");

  if (!ingestToken) {
    console.error("RAG_INGEST_TOKEN is not configured");

    return jsonResponse(
      {
        error: "RAG ingestion is not configured",
      },
      503,
    );
  }

  // ------------------------------------------------------------
  // Authorization
  // ------------------------------------------------------------

  const authorization = req.headers.get("Authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(
      {
        error: "Unauthorized",
      },
      401,
    );
  }

  const presentedToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!presentedToken) {
    return jsonResponse(
      {
        error: "Unauthorized",
      },
      401,
    );
  }

  // ------------------------------------------------------------
  // Constant-time token comparison
  // ------------------------------------------------------------

  const [presentedDigest, expectedDigest] = await Promise.all([
    sha256(presentedToken),
    sha256(ingestToken),
  ]);

  if (!constantTimeEqual(presentedDigest, expectedDigest)) {
    return jsonResponse(
      {
        error: "Unauthorized",
      },
      401,
    );
  }

  // ------------------------------------------------------------
  // Supabase environment
  // ------------------------------------------------------------

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  if (!supabaseUrl) {
    console.error("SUPABASE_URL is missing");

    return jsonResponse(
      {
        error: "Supabase configuration error",
      },
      503,
    );
  }

  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing");

    return jsonResponse(
      {
        error: "Supabase configuration error",
      },
      503,
    );
  }

  // ------------------------------------------------------------
  // Server-side Supabase client
  // ------------------------------------------------------------

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
  );

  // ------------------------------------------------------------
  // Parse request
  // ------------------------------------------------------------

  let payload: IngestRequest;

  try {
    payload = await req.json();
  } catch (error) {
    console.error("Invalid JSON request");

    return jsonResponse(
      {
        error: "Invalid JSON body",
      },
      400,
    );
  }

  // ------------------------------------------------------------
  // Validate documents
  // ------------------------------------------------------------

  if (!payload || !Array.isArray(payload.documents)) {
    return jsonResponse(
      {
        error: "documents must be an array",
      },
      400,
    );
  }

  if (payload.documents.length === 0) {
    return jsonResponse(
      {
        error: "At least one document is required",
      },
      400,
    );
  }

  // ------------------------------------------------------------
  // Ingestion
  // ------------------------------------------------------------

  let docsUpserted = 0;
  let chunksUpserted = 0;

  try {
    for (
      const [docIndex, doc] of payload.documents.entries()
    ) {
      // --------------------------------------------------------
      // Validate document
      // --------------------------------------------------------

      if (!doc || typeof doc !== "object") {
        throw new Error(
          `Document ${docIndex} is invalid`,
        );
      }

      if (
        typeof doc.title !== "string" ||
        !doc.title.trim()
      ) {
        throw new Error(
          `Document ${docIndex} is missing title`,
        );
      }

      if (
        typeof doc.content !== "string" ||
        !doc.content.trim()
      ) {
        throw new Error(
          `Document "${doc.title}" is missing content`,
        );
      }

      const title = doc.title.trim();

      const source =
        typeof doc.source === "string"
          ? doc.source.trim()
          : null;

      const category =
        typeof doc.category === "string"
          ? doc.category.trim()
          : null;

      const content = doc.content.trim();

      console.log(
        `Processing document ${docIndex + 1}/${payload.documents.length}: ${title}`,
      );

      // --------------------------------------------------------
      // Upsert document
      // --------------------------------------------------------

      const { data: documentRow, error: documentError } =
        await supabase
          .from("financial_documents")
          .upsert(
            {
              title,
              source,
              category,
              content,
            },
            {
              onConflict: "title",
            },
          )
          .select("id")
          .single();

      if (documentError) {
        console.error(
          `Document upsert failed for "${title}"`,
          documentError,
        );

        throw new Error(
          "Knowledge document could not be stored",
        );
      }

      if (!documentRow?.id) {
        throw new Error(
          "Knowledge document did not return an id",
        );
      }

      docsUpserted++;

      const documentId = documentRow.id;

      // --------------------------------------------------------
      // Chunk document
      // --------------------------------------------------------

      const chunks = chunkText(content);

      console.log(
        `"${title}" produced ${chunks.length} chunks`,
      );

      // --------------------------------------------------------
      // Embed + store chunks
      // --------------------------------------------------------

      for (
        let chunkIndex = 0;
        chunkIndex < chunks.length;
        chunkIndex++
      ) {
        const chunk = chunks[chunkIndex];

        if (!chunk.trim()) {
          continue;
        }

        console.log(
          `Embedding chunk ${chunkIndex + 1}/${chunks.length} for "${title}"`,
        );

        const embedding = await generateEmbedding(chunk);

        if (!Array.isArray(embedding)) {
          throw new Error(
            "Embedding generation failed",
          );
        }

        if (embedding.length !== 384) {
          throw new Error(
            "Embedding dimension mismatch",
          );
        }

        const { error: chunkError } =
          await supabase
            .from("financial_document_chunks")
            .upsert(
              {
                document_id: documentId,
                chunk_index: chunkIndex,
                content: chunk,
                embedding,
              },
              {
                onConflict:
                  "document_id,chunk_index",
              },
            );

        if (chunkError) {
          console.error(
            `Chunk upsert failed for "${title}" chunk ${chunkIndex}`,
            chunkError,
          );

          throw new Error(
            "Knowledge chunk could not be stored",
          );
        }

        chunksUpserted++;
      }
    }

    // ----------------------------------------------------------
    // Success
    // ----------------------------------------------------------

    console.log(
      `RAG ingestion completed: ${docsUpserted} documents, ${chunksUpserted} chunks`,
    );

    return jsonResponse({
      ok: true,
      docsUpserted,
      chunksUpserted,
    });
  } catch (error) {
    // ----------------------------------------------------------
    // Production-safe error response
    // ----------------------------------------------------------
    // Detailed internal error is logged server-side only.
    // The client receives a generic message.
    // ----------------------------------------------------------

    console.error("RAG ingestion failed:", error);

    return jsonResponse(
      {
        error: "Ingest failed",
      },
      500,
    );
  }
});
