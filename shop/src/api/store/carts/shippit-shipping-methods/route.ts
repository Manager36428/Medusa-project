import { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import CartService from "../../../../services/cart";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id } = req.params;
    const cartService: CartService = req.scope.resolve("cartService");
    const shippingOptions = await cartService.getShippitShippingMethods(id);
    res.status(200).json(shippingOptions);
  } catch (err) {
    res.sendStatus(500);
  }
}
