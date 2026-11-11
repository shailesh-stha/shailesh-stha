export {};
declare global {
  interface DesignBehaviorUtil {
    uid(prefix?: string): string;
    ensureId(el: Element, prefix?: string): string;
    focusables(root: Element): HTMLElement[];
    on(target: EventTarget, type: string, handler: (event: any) => void, options?: AddEventListenerOptions | boolean): () => void;
    arrowNav(event: KeyboardEvent, items: HTMLElement[], current: number, horizontal?: boolean): boolean;
    reducedMotion(): boolean;
    emit(el: Element, name: string, detail?: unknown): void;
  }
  interface Window {
    designBehaviors: {
      util: DesignBehaviorUtil;
      register(name: string, selector: string, setup: (el: HTMLElement, util: DesignBehaviorUtil) => void | (() => void)): void;
      init(root?: ParentNode): void;
      destroy(root?: ParentNode): void;
    };
  }
}
