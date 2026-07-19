export default function AuthErrorPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">ログインエラー</h1>
        <p className="mt-2 text-muted">認証に失敗しました。もう一度お試しください。</p>
        <a
          href="/"
          className="mt-4 inline-block rounded-[14px] bg-primary px-6 py-3 font-semibold text-white"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}
