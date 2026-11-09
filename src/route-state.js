/** Scroll coordinates are local to a route; interaction state never lives here. */
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const MUSEUM_ENTRY = .10;
export const MUSEUM_STOPS = [
  {id: 'heritage', at: .20, from: 0, to: .29, label: '江汉水土'},
  {id: 'craft', at: .38, from: .29, to: .47, label: '刀下纹样'},
  {id: 'voices', at: .56, from: .47, to: .65, label: '乡音戏班'},
  {id: 'people', at: .74, from: .65, to: .83, label: '传艺的人'},
  {id: 'legacy', at: .92, from: .83, to: 1, label: '留住一门戏'},
];
export const ROUTE_HEIGHTS = {public: 5, museum: 18, game: 14};
export function museumStop(progress) {
  return MUSEUM_STOPS.find(stop => progress < stop.to) || MUSEUM_STOPS.at(-1);
}

export class RouteState {
  constructor() {
    this.route = 'public';
    this.progress = {public: 0, museum: 0, game: 0};
    this.transition = null;
    this.interaction = null;
    this.gameActive = false;
  }
  setProgress(value) { this.progress[this.route] = clamp(value); }
  get position() { return this.progress[this.route]; }
  get atHall() { return this.route === 'public' && this.position >= .985; }
  begin(route, now, {resume = false} = {}) {
    if (this.transition || this.interaction || this.gameActive || !Object.hasOwn(this.progress, route)) return false;
    if (route === this.route) return false;
    this.transition = {from: this.route, to: route, start: now, duration: 900};
    this.route = route;
    if (!resume) this.progress[route] = route === 'public' ? 1 : 0;
    return true;
  }
  advance(now, reduced = false) {
    if (!this.transition) return 1;
    const fraction = reduced ? 1 : clamp((now - this.transition.start) / this.transition.duration);
    if (fraction === 1) this.transition = null;
    return fraction;
  }
}
