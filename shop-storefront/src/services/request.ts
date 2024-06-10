import axios from "axios"

export default async (method: string, path = "", payload = {}) => {
  let baseURL =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  let client = axios.create({ baseURL }) as any
  if (client) {
    const options = {
      method,
      withCredentials: false,
      url: path,
      data: payload,
      json: true,
    }
    console.log(options)
    console.log(client)
    try {
      const response = await client(options)
      return response
    } catch (error) {
      throw error
    }
  }
}
