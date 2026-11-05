import { type Metadata } from "next"

import {
  BrandSection,
  ColourSection,
  ComponentsSection,
  LayoutSection,
  LeftOutSection,
  PageHeader,
  PatternsSection,
  TypeSection,
} from "@/app/design-system/sections"

export const metadata: Metadata = {
  title: "Design system",
  description: "The tokens, type and components behind ShiftPatch.",
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-12 pb-24 md:px-14">
      <PageHeader />
      <BrandSection />
      <ColourSection />
      <TypeSection />
      <LayoutSection />
      <ComponentsSection />
      <PatternsSection />
      <LeftOutSection />
    </main>
  )
}
