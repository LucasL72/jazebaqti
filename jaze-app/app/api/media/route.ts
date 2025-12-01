import { handleSignedMediaRequest } from "@/lib/media-storage";

export async function GET(req: Request) {
  return handleSignedMediaRequest(req);
}
