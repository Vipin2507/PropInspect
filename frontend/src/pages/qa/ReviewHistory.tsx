import { useReviewHistory } from '../../hooks/useReviews'
import { Badge } from '../../components/ui/Badge'
import { Table, Th, Td } from '../../components/ui/Table'

export default function ReviewHistory() {
  const { history, loading } = useReviewHistory()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Review History</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Flat</Th>
              <Th>Decision</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {(history as { flatNumber: string; decision: string; reviewedAt: string }[]).map((r, i) => (
              <tr key={i}>
                <Td>{r.flatNumber}</Td>
                <Td>
                  <Badge status={r.decision}>{r.decision}</Badge>
                </Td>
                <Td>{new Date(r.reviewedAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
