import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { getAIProvider } from "@/lib/ai/provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantId,
      items,
      deliveryAddress,
      timeOfDay,
      weather,
      demand,
      distance,
    } = body;

    const systemPrompt = `You are an AI pricing optimization engine for a food delivery platform.
Analyze the given factors and suggest optimal pricing adjustments.

Factors to consider:
- Current demand and supply
- Time of day (peak hours, off-peak)
- Weather conditions (bad weather = higher demand for delivery)
- Delivery distance
- Restaurant popularity
- Item popularity

Return a JSON object with:
{
  "adjustedDeliveryFee": number (in dollars),
  "dynamicSurcharge": number (percentage, 0-30),
  "estimatedPrepTime": number (minutes),
  "surgeReason": string,
  "confidence": number (0-1),
  "breakdown": {
    "baseFee": number,
    "distanceAdjustment": number,
    "demandAdjustment": number,
    "weatherAdjustment": number,
    "timeAdjustment": number
  }
}

Rules:
- Never exceed 30% surcharge
- Base delivery fee should be between $0 and $10
- Be transparent about pricing adjustments
- Consider fairness and customer satisfaction`;

    const userPrompt = `Pricing optimization request:
Restaurant ID: ${restaurantId ?? "unknown"}
Items: ${JSON.stringify(items ?? [])}
Delivery address: ${JSON.stringify(deliveryAddress ?? {})}
Time of day: ${timeOfDay ?? new Date().getHours()}
Weather: ${JSON.stringify(weather ?? { condition: "clear", temperature: 72 })}
Demand level: ${demand ?? "normal"}
Delivery distance: ${distance ?? "unknown miles"}

Calculate optimal pricing for this order.`;

    const provider = getAIProvider();

    try {
      const response = await provider.complete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: "json_object" },
      });

      let pricing;
      try {
        pricing = JSON.parse(response.content);
      } catch {
        pricing = {
          adjustedDeliveryFee: 3.99,
          dynamicSurcharge: 0,
          estimatedPrepTime: 15,
          surgeReason: "Standard pricing",
          confidence: 0.5,
          breakdown: {
            baseFee: 3.99,
            distanceAdjustment: 0,
            demandAdjustment: 0,
            weatherAdjustment: 0,
            timeAdjustment: 0,
          },
        };
      }

      pricing.adjustedDeliveryFee = Math.max(
        0,
        Math.min(10, pricing.adjustedDeliveryFee ?? 3.99)
      );
      pricing.dynamicSurcharge = Math.max(
        0,
        Math.min(30, pricing.dynamicSurcharge ?? 0)
      );

      return NextResponse.json({
        pricing,
        metadata: {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
        },
      });
    } catch (aiError) {
      const baseFee = 3.99;
      const distanceMiles = parseFloat(distance) || 5;
      const distanceAdjustment = Math.max(0, (distanceMiles - 2) * 0.5);
      const timeHour = timeOfDay ?? new Date().getHours();
      const timeAdjustment =
        timeHour >= 11 && timeHour <= 13
          ? 1
          : timeHour >= 17 && timeHour <= 20
          ? 1.5
          : 0;

      return NextResponse.json({
        pricing: {
          adjustedDeliveryFee: parseFloat(
            (baseFee + distanceAdjustment + timeAdjustment).toFixed(2)
          ),
          dynamicSurcharge: 0,
          estimatedPrepTime: 15,
          surgeReason: "Standard pricing (AI unavailable)",
          confidence: 0.3,
          breakdown: {
            baseFee,
            distanceAdjustment: parseFloat(distanceAdjustment.toFixed(2)),
            demandAdjustment: 0,
            weatherAdjustment: 0,
            timeAdjustment: parseFloat(timeAdjustment.toFixed(2)),
          },
        },
        metadata: {
          provider: "fallback",
          model: "rule-based",
          latencyMs: 0,
        },
      });
    }
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message, code: appError.code },
      { status: appError.statusCode }
    );
  }
}
