"use client"; // Marca este componente como un Client Component

import FacialValidationScreen from "../../components/FacialValidationScreen"; // Ruta corregida: dos niveles arriba, luego a 'components'

// Este componente se renderizará cuando la ruta sea /facial-validation-screen
export default function FacialValidationPage() {
  return <FacialValidationScreen />;
}
