import { Clock, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./card";
import { Badge } from "./badge";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { Restaurant } from "@/types";

export interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

function RestaurantCard({ restaurant, className }: RestaurantCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5", className)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
        {!restaurant.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="secondary">Closed</Badge>
          </div>
        )}
        {restaurant.deliveryFee === 0 && (
          <Badge className="absolute right-2 top-2" variant="success">
            Free Delivery
          </Badge>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {restaurant.rating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">
              ({restaurant.reviewCount})
            </span>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {restaurant.cuisineType.map((cuisine) => (
            <Badge key={cuisine} variant="secondary" className="text-xs">
              {cuisine}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(restaurant.deliveryTime)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="truncate max-w-[150px]">{restaurant.address}</span>
          </div>
        </div>
        {restaurant.deliveryFee > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Delivery: {formatPrice(restaurant.deliveryFee)} · Min: {formatPrice(restaurant.minimumOrder)}
          </p>
        )}
      </div>
    </Card>
  );
}

export { RestaurantCard };
