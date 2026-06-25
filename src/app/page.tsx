import { redirect } from "next/navigation";

export default function Home() {
  // Open straight into the listings, like a real opportunity board.
  redirect("/feed");
}
