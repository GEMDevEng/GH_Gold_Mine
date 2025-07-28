# UI Components Library

This directory contains reusable UI components built with React, TypeScript, and Tailwind CSS. All components follow accessibility best practices and are designed to work seamlessly with the GitHub Project Miner application.

## Components Overview

### Core Components

#### Button
A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- All standard button HTML attributes

#### Card
A flexible card component with header, content, and footer sections.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
  <CardFooter>
    Card footer actions
  </CardFooter>
</Card>
```

#### Badge
Small status indicators with different variants.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'warning' | 'error'

### Form Components

#### Input
Text input with label, error, and helper text support.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error="Invalid email format"
  helperText="We'll never share your email"
/>
```

#### Textarea
Multi-line text input with similar features to Input.

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Description"
  placeholder="Enter description"
  rows={4}
/>
```

#### Select
Dropdown select with options and styling.

```tsx
import { Select } from '@/components/ui';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

<Select
  label="Choose option"
  options={options}
  placeholder="Select an option"
/>
```

### Data Display

#### Table
Responsive table components for displaying tabular data.

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Feedback Components

#### Alert
Contextual feedback messages with different severity levels.

```tsx
import { Alert } from '@/components/ui';

<Alert variant="success" title="Success!" dismissible onDismiss={() => {}}>
  Your action was completed successfully.
</Alert>
```

#### Loading Components
Various loading states and skeleton screens.

```tsx
import { LoadingSpinner, LoadingOverlay, Skeleton, SkeletonCard } from '@/components/ui';

<LoadingSpinner size="lg" />
<LoadingOverlay isLoading={true} message="Loading data...">
  <div>Content</div>
</LoadingOverlay>
<Skeleton width="w-full" height="h-4" />
<SkeletonCard lines={3} showAvatar={true} />
```

### Navigation

#### Tabs
Tab navigation component with context-based state management.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content for tab 1</TabsContent>
  <TabsContent value="tab2">Content for tab 2</TabsContent>
</Tabs>
```

### Overlay

#### Modal
Accessible modal dialog with customizable size and content.

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';

<Modal isOpen={true} onClose={() => {}} title="Modal Title" size="md">
  <ModalBody>
    Modal content goes here
  </ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={() => {}}>Cancel</Button>
    <Button variant="primary" onClick={() => {}}>Save</Button>
  </ModalFooter>
</Modal>
```

## Design System

### Colors
Components use the predefined color palette from Tailwind CSS configuration:
- Primary: Blue tones for main actions
- Secondary: Gray tones for secondary actions
- Success: Green for positive feedback
- Warning: Yellow for warnings
- Error: Red for errors

### Typography
- Font family: Inter (sans-serif) and JetBrains Mono (monospace)
- Consistent font weights and sizes across components

### Spacing
- Follows 8px grid system (8px, 16px, 24px, 32px)
- Consistent padding and margins

### Accessibility
- All interactive elements have proper ARIA labels
- Keyboard navigation support
- High contrast ratios for text readability
- Focus indicators for keyboard users

## Usage Guidelines

1. **Import from index**: Always import components from the main index file
2. **TypeScript**: All components are fully typed with TypeScript
3. **Styling**: Use className prop for additional styling, but prefer component variants
4. **Accessibility**: Components include accessibility features by default
5. **Responsive**: All components are mobile-first responsive

## Examples

See the main App.tsx file for real-world usage examples of these components in the GitHub Project Miner application.
