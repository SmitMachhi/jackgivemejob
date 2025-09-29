import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const useUploadThing = import("@uploadthing/react").then((mod) => mod.useUploadThing<OurFileRouter>);