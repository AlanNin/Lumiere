import { queryClient } from "@/providers/reactQuery";
import { libraryController } from "@/server/controllers/library";

export async function PrefetchLibrary() {
  try {
    await queryClient.prefetchQuery({
      queryKey: ["library"],
      queryFn: () => libraryController.getLibrary({ downloadedOnly: false }),
    });
  } catch (err) {
    console.warn("Library prefetch failed:", err);
  }
}
