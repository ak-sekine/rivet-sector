export function showError(error: unknown): void {
  const panel = document.querySelector<HTMLElement>('#error')!;
  panel.textContent = `3D描画を開始できませんでした。\n${error instanceof Error ? error.message : String(error)}\nWebGLが有効なブラウザで再読み込みしてください。`;
  panel.hidden = false;
  document.querySelector<HTMLElement>('#status')!.hidden = true;
}

export function showReady(): void {
  document.querySelector<HTMLElement>('#status')!.textContent = 'TPS PROTOTYPE';
}
