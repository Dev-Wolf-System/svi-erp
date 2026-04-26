import { redirect } from "next/navigation";

/** Root del admin redirige al dashboard. El middleware se encarga de la auth. */
export default function RootPage() {
  redirect("/dashboard");
}
