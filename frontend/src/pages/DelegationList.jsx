import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Calendar, ArrowRight } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'

export default function DelegationList() {
  const [delegations, setDelegations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDelegations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/delegation/active')
      setDelegations(res.data || [])
    } catch {
      setDelegations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDelegations()
  }, [fetchDelegations])

  const roleLabel = (role) => {
    const map = { supervisor: '主管', employee: '员工', hr: '人事' }
    return map[role] || role
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">生效委托列表</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : delegations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Calendar className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无生效的审批委托</p>
        </div>
      ) : (
        <div className="space-y-4">
          {delegations.map((d) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-medium text-amber-700">
                        {d.delegator_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{d.delegator_name}</p>
                        <p className="text-xs text-slate-400">
                          {d.delegator_dept || '未知部门'} · {roleLabel(d.delegator_role)}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-slate-300" />

                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                        {d.delegate_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{d.delegate_name}</p>
                        <p className="text-xs text-slate-400">
                          {d.delegate_dept || '未知部门'} · {roleLabel(d.delegate_role)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600 space-y-1">
                    <p>
                      <span className="text-slate-400">委托期限：</span>
                      {dayjs(d.start_date).format('YYYY-MM-DD')} 至 {dayjs(d.end_date).format('YYYY-MM-DD')}
                    </p>
                    {d.reason && (
                      <p>
                        <span className="text-slate-400">委托原因：</span>
                        {d.reason}
                      </p>
                    )}
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  生效中
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
