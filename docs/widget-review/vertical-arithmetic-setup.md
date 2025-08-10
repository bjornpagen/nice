### vertical-arithmetic-setup — Manual Widget Review

Principles: minimize nullables; no `.default()`; explicit operator and operands.

Scope
- Purpose: present two-operand vertical arithmetic setup with optional title

Current pain points
- Nullable `title`.

Proposed API (no feature loss, fewer nullables)
- Make `title` a string (empty allowed to omit rendering).

Schema sketch
```ts
export const VerticalArithmeticSetupPropsSchema = z.object({
  type: z.literal('verticalArithmeticSetup').describe("Identifies this as a vertical arithmetic setup widget for displaying math problems in traditional column format."),
  title: z.string().describe("Optional instruction or problem context displayed above the arithmetic (e.g., 'Calculate:', 'Find the product:', 'Solve:', ''). Empty string means no title."),
  operand1: z.string().describe("The top number in the calculation, as a string to preserve formatting (e.g., '345', '12.5', '1,234', '7'). Appears above the line."),
  operand2: z.string().describe("The bottom number in the calculation, as a string to preserve formatting (e.g., '67', '0.25', '89', '456'). Appears below operand1."),
  operator: z.enum(['×','+','−']).describe("The arithmetic operation symbol. '×' for multiplication, '+' for addition, '−' for subtraction. Appears to the left of operand2."),
}).strict().describe("Creates a traditional vertical (column) arithmetic setup showing two numbers with an operation, ready for students to solve. Displays numbers aligned by place value with the operator symbol and a horizontal line where the answer would go. Perfect for teaching standard algorithms for addition, subtraction, and multiplication.")```

Why this helps
- Removes null handling; generator can check for empty string to skip title.


