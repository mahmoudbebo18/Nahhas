import { Package, Receipt, Truck, HardHat } from 'lucide-react'

/**
 * The four entry types the portal writes. (Labour is deliberately excluded.)
 *
 * Note the `productParam` / `postPath` split: the product lookup takes
 * `?type=expenses` (plural) while the write goes to `/expense` (singular).
 * That asymmetry is in the API contract — keep it in this one table rather
 * than scattered through the forms.
 */
export const ENTRY_TYPES = {
  material: {
    key: 'material',
    productParam: 'material',
    postPath: 'material',
    icon: Package,
    /** Tailwind accent used for the tile + form header. */
    tone: 'primary',
    supportsAttachments: false,
  },
  expense: {
    key: 'expense',
    productParam: 'expenses',
    postPath: 'expense',
    icon: Receipt,
    tone: 'accent',
    supportsAttachments: true,
  },
  equipment: {
    key: 'equipment',
    productParam: 'equipment',
    postPath: 'equipment',
    icon: Truck,
    tone: 'primary',
    supportsAttachments: true,
  },
  subcontractor: {
    key: 'subcontractor',
    productParam: 'subcontractor',
    postPath: 'subcontractor',
    icon: HardHat,
    tone: 'accent',
    supportsAttachments: true,
  },
}

export const ENTRY_ORDER = ['material', 'expense', 'equipment', 'subcontractor']

export const isEntryType = (value) => Object.hasOwn(ENTRY_TYPES, value)

/**
 * Reading the API's `available` map — how many products a sub-task holds per
 * entry type. Its keys are the API's type names, so go through `productParam`
 * rather than our own keys.
 *
 * `null` means *not known*: a server too old to send the map, or a lookup that
 * has not landed yet. It must never read as zero — locking an engineer out of
 * a form that would have worked is far worse than letting them meet the empty
 * state they would have met anyway.
 */
export const availableFor = (available, key) =>
  available?.[ENTRY_TYPES[key]?.productParam] ?? null

/** True only when the API positively reports no products for this type. */
export const isTypeEmpty = (available, key) => availableFor(available, key) === 0

/** True only when nothing the portal can write is set up on the sub-task. */
export const hasNothingToEnter = (available) =>
  Boolean(available) && ENTRY_ORDER.every((key) => isTypeEmpty(available, key))

/** The five levels the API can report, in drill order. */
export const LEVEL_ORDER = ['project', 'building', 'floor', 'unit', 'additional_unit']
