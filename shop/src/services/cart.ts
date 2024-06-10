import {
  Cart,
  CartService as MedusaCartService,
  ShippingOption,
  ShippingOptionPriceType,
} from "@medusajs/medusa";
import ShippingOptionRepository from "@medusajs/medusa/dist/repositories/shipping-option";
import { ShippingOptionPricing } from "@medusajs/medusa/dist/types/pricing";
import axios from "axios";
import { Like } from "typeorm";

type quoteType = {
  success: boolean;
  courier_type: string;
  service_level: string;
  quotes: {
    price: number;
    estimated_transit_time: string;
  }[];
};
export type PricedShippingOption = Partial<ShippingOption> &
  ShippingOptionPricing;
class CartService extends MedusaCartService {
  protected shippingOptionRepository_: typeof ShippingOptionRepository;
  constructor(container) {
    super(container);
    try {
      this.shippingOptionRepository_ = container.shippingOptionRepository;
    } catch (e) {}
  }

  async getShippitShippingMethods(id: string) {
    const cart = await this.retrieve(id, {
      relations: ["items.variant", "shipping_address"],
    });
    if (!cart) return Error("No cart found");
    const shippingOptions = (await this.getShippitShippingOptions(
      cart.id
    )) as ShippingOption[];
    if (!shippingOptions) return Error("Couldn't create shipping options");
    const shippingMethods = [] as PricedShippingOption[];
    for (const shippingOption of shippingOptions) {
      const shippingMethod =
        await this.shippingOptionService_.createShippingMethod(
          shippingOption.id,
          shippingOption.data,
          {
            shipping_option_id: shippingOption.id,
            cart_id: cart.id,
            price: shippingOption.amount,
            data: shippingOption.data,
          }
        );
      if (shippingMethod)
        shippingMethods.push({
          ...shippingMethod,
          price_incl_tax: shippingMethod.price,
          tax_rates: [],
          tax_amount: 0,
        });
    }
    return shippingMethods;
  }

  async getShippitShippingOptions(
    id: string
  ): Promise<ShippingOption[] | Error> {
    const cart = await this.retrieve(id, {
      relations: ["items.variant", "shipping_address"],
    });
    if (!cart) return Error("No cart found");
    const shippingOptionRepo = this.manager_.withRepository(
      this.shippingOptionRepository_
    );

    const retrieveShippingOptions = await shippingOptionRepo.find({
      where: {
        name: Like(`%${cart.id}%`),
      },
    });
    if (retrieveShippingOptions.length) return retrieveShippingOptions;
    const quotes = (await this.calculateQuote(cart)) as quoteType[];

    const shippingProfile = await this.shippingProfileService_.createDefault();
    const shippingOptions = [];
    for (const quote of quotes) {
      const shippingOption = shippingOptionRepo.create({
        name: `${cart.id}|${quote.service_level}`,
        price_type: ShippingOptionPriceType.CALCULATED,
        amount: Math.floor(quote.quotes[0]?.price * 100),
        admin_only: false,
        provider_id: "manual",
        profile_id: shippingProfile.id,
        region_id: cart.region_id,
        is_return: false,
        data: {
          estimated_transit_time: quote.quotes[0]?.estimated_transit_time,
        },
      });
      if (shippingOption) {
        const save = await shippingOptionRepo.save(shippingOption);
        shippingOptions.push(save);
      } else {
        const shippingOption = await shippingOptionRepo.findOne({
          where: {
            name: quote.service_level,
          },
        });
        if (shippingOption) shippingOptions.push(shippingOption);
      }
    }
    return shippingOptions;
  }

  async calculateQuote(cart: Cart) {
    const postal_code = cart.shipping_address.postal_code;
    const state = cart.shipping_address.province;
    const suburb = cart.shipping_address.city;
    const parcel_attributes = cart.items.map((i) => ({
      qty: i.quantity,
      weight: i.variant.weight,
    }));

    const quote = {
      dropoff_postcode: postal_code,
      dropoff_state: state,
      dropoff_suburb: suburb,
      parcel_attributes: parcel_attributes,
    };

    const getQuote = await axios.post(
      "https://app.staging.shippit.com/api/3/quotes",
      { quote: quote },
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPPIT_API_KEY}`,
        },
      }
    );
    const standard = getQuote.data.response.find(
      (r) => r.service_level === "standard"
    ) as quoteType;
    const express = getQuote.data.response.find(
      (r) => r.service_level === "express"
    ) as quoteType;

    return [standard, express] as quoteType[];
  }
}

export default CartService;
