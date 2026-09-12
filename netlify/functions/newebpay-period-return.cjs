exports.handler = async (event) => {
  const query = new URLSearchParams(event.rawQuery || "");
  const target = new URL("/member/orders", "https://nestobi.com");
  const merchantOrderNo = query.get("merchantOrderNo");
  if (merchantOrderNo) target.searchParams.set("merchantOrderNo", merchantOrderNo);
  target.searchParams.set("payment", "subscription");

  return {
    statusCode: 303,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store",
    },
    body: "",
  };
};
