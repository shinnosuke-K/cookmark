// プロンプトの .txt を文字列として import するための型宣言。
// 読み込み自体は next.config.ts の webpack ルール(asset/source)が行う。
declare module "*.txt" {
  const content: string;
  export default content;
}
