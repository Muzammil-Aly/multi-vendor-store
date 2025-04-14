import mongoose, { Schema } from "mongoose";

const ProductSchema = new Schema({
  id: String,
  url: String,
  detailUrl: String,
  title: {
    shortTitle: String,
    longTitle: String,
  },
  price: {
    mrp: Number, //minimum retail price
    cost: Number,
    discount: String,
  },
  description: String,
  discount: String,
  tagline: String,
});

export const Product = mongoose.model("Poduct", ProductSchema);
