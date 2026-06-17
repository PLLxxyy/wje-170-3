import { useState, useEffect, useCallback } from 'react'
import { UserCheck, Plus, X, Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'

const STATUS_MAP = {
  active: { label: '生效中', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', cls: 'bg-slate-100 text-slate-500' },
  expired: { label: '已过期', cls: 'bg-slate-100 text-slate-500' },
}

export default function DelegationManage() {
  const [delegations, setDelegations] = useState([])
  const [potentialDelegates, setPotentialDelegates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    delegate_id: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    reason: '',
  })

  const fetchDelegations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/delegation')
      setDelegations(res.data || [])
    } catch {
      setDelegations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPotentialDelegates = useCallback(async () => {
    try {
      const res = await api.get('/delegation/potential-delegates')
      setPotentialDelegates(res.data || [])
    } catch {
      setPotentialDelegates([])
    }
  }, [])

  useEffect(() => {
    fetchDelegations()
    fetchPotentialDelegates()
  }, [fetchDelegations, fetchPotentialDelegates])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.delegate_id || !form.start_date || !form.end_date) return
    setSubmitting(true)
    try {
      await api.post('/delegation', form)
      setShowForm(false)
      setForm({
        delegate_id: '',
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        reason: '',
      })
      fetchDelegations()
    } catch (err) {
      alert(err.response?.data?.error || '创建委托失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('确定要取消此委托吗？')) return
    try {
      await api.delete(`/delegation/${id}`)
      fetchDelegations()
    } catch (err) {
      alert(err.response?.data?.error || '取消委托失败')
    }
  }

  const getStatusInfo = (d) => {
    if (d.status === 'cancelled') return STATUS_MAP.cancelled
    if (d.end_date < dayjs().format('YYYY-MM-DD')) return STATUS_MAP.expired
    return STATUS_MAP.active
  }

  const isActive = (d) => {
    return d.status === 'active' &&
      d.start_date <= dayjs().format('YYYY-MM-DD') &&
      d.end_date >= dayjs().format('YYYY-MM-DD')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">审批委托</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建委托
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">新建审批委托</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  被委托人 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.delegate_id}
                  onChange={(e) => setForm({ ...form, delegate_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">请选择被委托人</option>
                  {potentialDelegates.map((u) => {
                    const roleLabel = u.role === 'supervisor' ? '主管' : u.role === 'hr' ? '人事' : '员工'
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name}（{u.department_name || '未知部门'} - {roleLabel}）
                      </option>
                    )
                  })}
                </select>
              </div>
              {(() => {
                const selected = potentialDelegates.find((u) => String(u.id) === String(form.delegate_id))
                if (selected?.role === 'employee') {
                  return (
                    <div className="md:col-span-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-amber-600 text-xs font-medium">⚠️</span>
                      <p className="text-xs text-amber-700">
                        该被委托人为普通员工，系统将在委托期内自动授予其审批权限。委托到期后权限自动回收。
                      </p>
                    </div>
                  )
                }
                return null
              })()}
              <div />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  开始日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  结束日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                委托原因
              </label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="如：出差、休假等"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '提交中...' : '确认委托'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : delegations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Calendar className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无审批委托记录</p>
          <p className="text-sm mt-1">出差或休假时可委托他人代为审批</p>
        </div>
      ) : (
        <div className="space-y-4">
          {delegations.map((d) => {
            const statusInfo = getStatusInfo(d)
            return (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base font-semibold text-slate-800">
                        委托给 {d.delegate_name}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      {isActive(d) && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          当前生效
                        </span>
                      )}
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
                      <p>
                        <span className="text-slate-400">创建时间：</span>
                        {dayjs(d.created_at).format('YYYY-MM-DD HH:mm')}
                      </p>
                    </div>
                  </div>
                  {isActive(d) && (
                    <button
                      onClick={() => handleCancel(d.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      取消委托
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
