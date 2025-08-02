// declare module "*.svelte" {
//   import type { ComponentType } from "svelte";
//   const component: ComponentType;
//   export default component;
// }
declare module '*.svelte' {
	export { SvelteComponent as default } from 'svelte';
}