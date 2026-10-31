import { CardPayment } from "@mercadopago/sdk-react";

export default function TestMercadoPago() {
  return (
    <div style={{ maxWidth: 500, margin: "40px auto" }}>
      <h2>Prueba de tarjeta</h2>

      <CardPayment
        initialization={{ amount: 1000 }}
        onReady={() => console.log("PRUEBA: CardPayment listo")}
        onSubmit={async (data) => {
          console.log("PRUEBA: envío", data);
        }}
        onError={(error) => {
          console.error("PRUEBA: error", error);
        }}
      />
    </div>
  );
}