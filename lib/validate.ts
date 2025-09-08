import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export type Validated<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function validateJson<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<Validated<z.infer<T>>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid request body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
            code: i.code,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: parsed.data };
}
