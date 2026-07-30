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

/** The five levels the API can report, in drill order. */
export const LEVEL_ORDER = ['project', 'building', 'floor', 'unit', 'additional_unit']
