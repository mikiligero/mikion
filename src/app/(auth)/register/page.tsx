import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";

// Registro cerrado por defecto. Para crear una cuenta, pon MIKION_ALLOW_SIGNUP=true
// en el entorno (y recrea el contenedor); cuando termines, vuelve a quitarlo.
export default function RegisterPage() {
  if (process.env.MIKION_ALLOW_SIGNUP !== "true") redirect("/login");
  return <RegisterForm />;
}
