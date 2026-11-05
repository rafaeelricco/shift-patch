export { cn }

function cn(...classes: ReadonlyArray<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ")
}
