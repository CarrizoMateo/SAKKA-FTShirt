import { CardPayment } from "@mercadopago/sdk-react";

export default function CardPaymentTest() {
  return (
    <main
      style={{
        maxWidth: 520,
        margin: "40px auto",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2>SAKKA — Prueba de tarjeta</h2>
      <p>Importe de prueba: $43.000</p>
      <p>Esta pantalla solo comprueba si se cargan los campos. No procesa pagos.</p>

      <CardPayment
        initialization={{ amount: 43000 }}
        onReady={() => console.log("PRUEBA: formulario listo")}
        onError={(error) => console.error("PRUEBA AISLADA:", error)}
        onSubmit={async () => {
          console.log("Prueba visual únicamente; no se procesa ningún pago.");
        }}
      />
    </main>
  );
}
