/** Scroll coordinates are local to a route; interaction state never lives here. */
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const MUSEUM_STOPS = [
  {id: 'heritage', at: .10, from: 0, to: .22, label: '识影馆'},
  {id: 'craft', at: .31, from: .22, to: .43, label: '影人工坊'},
  {id: 'stories', at: .52, from: .43, to: .64, label: '戏摊故事'},
  {id: 'light', at: .73, from: .64, to: .84, label: '光影实验'},
  {id: 'compose', at: .92, from: .84, to: 1, label: '自由编戏'},
];
export const ROUTE_HEIGHTS = {public: 5, museum: 24, game: 14};
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
