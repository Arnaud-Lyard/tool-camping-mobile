// Minimal ambient declaration for the parts of `suncalc` this app uses
// (the package ships no TypeScript types).
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

  const SunCalc: {
    getTimes(date: Date, latitude: number, longitude: number, height?: number): SunTimes;
    getMoonIllumination(date: Date): MoonIllumination;
    getMoonTimes(date: Date, latitude: number, longitude: number, inUTC?: boolean): MoonTimes;
  };

  export default SunCalc;
}
