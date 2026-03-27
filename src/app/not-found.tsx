const repoBasePath = "/sakura.github.io";
const redirectScript = `
  (function () {
    var profilePattern = new RegExp("^" + ${JSON.stringify(repoBasePath)} + "/profile/\\\\d+$");
    var currentPath = window.location.pathname;

    if (profilePattern.test(currentPath)) {
      window.sessionStorage.setItem("sakura-profile-path", currentPath);
      window.location.replace(${JSON.stringify(repoBasePath + "/profile")});
      return;
    }

    window.location.replace(${JSON.stringify(repoBasePath + "/")});
  })();
`;

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <div className="max-w-xl text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
          Redirecting
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tighter text-white">
          Preparing Sakura Route
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-400">
          Если профиль существует, страница будет автоматически восстановлена.
        </p>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: redirectScript,
        }}
      />
    </main>
  );
}
