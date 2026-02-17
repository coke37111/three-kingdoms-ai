export interface MapHighlight {
  cityName: string;
  type: "selected" | "battle" | "troop_movement" | "trade_route";
}

export interface CityReference {
  cityName: string;
  startIndex: number;
  endIndex: number;
}
