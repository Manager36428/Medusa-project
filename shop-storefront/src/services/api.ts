import medusaRequest from "./request"

export default {
  retrieveShippitShippingOptions: async (id: string) => {
    try {
      const path = `/store/carts/shippit-shipping-methods/${id}`
      const response = await medusaRequest("GET", path)
      return response
    } catch (error) {
      throw error
    }
  },
}
