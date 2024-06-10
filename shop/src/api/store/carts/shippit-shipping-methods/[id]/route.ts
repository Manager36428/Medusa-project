import {
  MedusaRequest,
  MedusaResponse,
  ShippingOption,
} from "@medusajs/medusa";
import CartService from "../../../../../services/cart";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id } = req.params;
    console.log("Id: ", id);
    const cartService: CartService = req.scope.resolve("cartService");
    const shippingOptions = (await cartService.getShippitShippingOptions(
      id
    )) as ShippingOption[];
    res.status(200).json(shippingOptions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
}
