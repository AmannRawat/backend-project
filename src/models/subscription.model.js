import mongoose, { Schema } from "mongoose";

const SubscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId, //user subscribing
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId, // who user Subscribing to
            ref: "User"
        }
    },
    { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", SubscriptionSchema)