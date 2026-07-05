// Minimal ambient declaration for the parts of `suncalc` this app uses
// (the package ships no TypeScript types). Declared with named exports so
// consumers use named imports — these map to direct property access on the
// CommonJS `module.exports` object, avoiding default-interop `undefined`.
declare module "suncalc" {
  export interface SunTimes {
    sunrise: Date;
    sunriseEnd: Date;
    goldenHourEnd: Date;
    solarNoon: Date;
    goldenHour: Date;
    sunsetStart: Date;
    sunset: Date;
    dusk: Date;
    dawn: Date;
    nadir: Date;
    night: Date;
    nightEnd: Date;
  }

  export interface MoonIllumination {
    fraction: number;
    phase: number;
    angle: number;
  }

  export interface MoonTimes {
    rise?: Date;
    set?: Date;
    alwaysUp?: boolean;
    alwaysDown?: boolean;
  }

  export function getTimes(date: Date, latitude: number, longitude: number, height?: number): SunTimes;
  export function getMoonIllumination(date: Date): MoonIllumination;
  export function getMoonTimes(date: Date, latitude: number, longitude: number, inUTC?: boolean): MoonTimes;
}
