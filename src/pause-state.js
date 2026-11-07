/** Independent owners may pause rendering without resuming another owner. */
export class PauseState {
  constructor() { this.reasons = new Set(); }
  set(reason, active) {
    if (active) this.reasons.add(reason);
    else this.reasons.delete(reason);
  }
  get active() { return this.reasons.size > 0; }
}
