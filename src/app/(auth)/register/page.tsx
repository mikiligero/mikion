import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";

// Evaluar en cada petición: MIKION_ALLOW_SIGNUP se lee en runtime (si no, el
// build prerenderiza la decisión y la redirección quedaría fija en la imagen).
export const dynamic = "force-dynamic";

// Registro cerrado por defecto. Para crear una cuenta, pon MIKION_ALLOW_SIGNUP=true
// en el entorno (y recrea el contenedor); cuando termines, vuelve a quitarlo.
export default function RegisterPage() {
  if (process.env.MIKION_ALLOW_SIGNUP !== "true") redirect("/login");
  return <RegisterForm />;
}
