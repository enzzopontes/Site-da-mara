export function getAdicionalCategory(a: { name: string; adicional_categoria?: string | null }) {
  if (a.adicional_categoria) return a.adicional_categoria
  const lower = (a.name || "").toLowerCase()
  if (
    lower.includes("bacon") ||
    lower.includes("frango") ||
    lower.includes("carne") ||
    lower.includes("alcatra") ||
    lower.includes("calabresa") ||
    lower.includes("costela") ||
    lower.includes("camarão")
  )
    return "proteinas"
  if (
    lower.includes("catupiry") ||
    lower.includes("cheddar") ||
    lower.includes("mussarela") ||
    lower.includes("queijo") ||
    lower.includes("parmesão") ||
    lower.includes("provolone") ||
    lower.includes("gorgonzola")
  )
    return "queijos"
  if (
    lower.includes("molho") ||
    lower.includes("maionese") ||
    lower.includes("barbecue") ||
    lower.includes("creme") ||
    lower.includes("alho") ||
    lower.includes("rosé")
  )
    return "molhos"
  return "complementos"
}
