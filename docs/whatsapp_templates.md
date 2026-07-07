# WhatsApp message templates, for Meta submission

Submit these three in Meta Business Manager under WhatsApp Manager, Message Templates. Category UTILITY for all three, since anything that reads as promotional gets rejected. Language English (US).

## 1. vendor_confirmation_request

**Category:** Utility
**Body:**

```
Hi {{1}}, this is {{2}} coordinating for {{3}}'s wedding on {{4}}. Can you confirm you're on track for {{5}}? Reply yes or no, or call if something's changed.
```

**Sample values for review:** Rohan Caterers, Priya Events, Aisha and Karan, 14 Feb 2027, the Sangeet dinner service

## 2. payment_reminder

**Category:** Utility
**Body:**

```
Hi {{1}}, a reminder that the payment of {{2}} for {{3}}'s wedding is due on {{4}}. Let us know once it's done, or reach out if you need more time.
```

**Sample values for review:** Rohan Caterers, 50,000 rupees, Aisha and Karan, 1 Feb 2027

## 3. plan_update

**Category:** Utility
**Body:**

```
Hi {{1}}, here's an update on {{2}}'s wedding: {{3}}. Please check this and confirm you've seen it.
```

**Sample values for review:** Rohan Caterers, Aisha and Karan, the Sangeet venue changed to the Grand Ballroom

## Notes

- Keep the variable count matching what the backend sends, positions 1 through 5 for the confirmation template, 1 through 4 for payment, 1 through 3 for the update. If backend code changes what it passes, the template edit needs re-approval, so lock the variable list before wiring send code in Phase 3.
- First submission sometimes bounces on wording. If rejected, the rejection reason usually points at one phrase reading as promotional or vague, reword just that line and resubmit.
