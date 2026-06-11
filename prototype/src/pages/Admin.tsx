import { AdminMasterDataPanel } from '../components/admin/AdminMasterDataPanel'
import { AdminUserPanel } from '../components/admin/AdminUserPanel'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui'

export function Admin() {
  const {
    platformUsers,
    currentUser,
    registerPlatformUser,
    updatePlatformUser,
    deletePlatformUser,
    masterData,
    addMasterDataItem,
    updateMasterDataItem,
    deleteMasterDataItem,
    mandatoryQuestions,
    addMandatoryQuestion,
    updateMandatoryQuestion,
    deleteMandatoryQuestion,
  } = useApp()

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Manage users and master data in Supabase. Mandatory questions are always included in every assessment."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminUserPanel
          users={platformUsers}
          currentUserId={currentUser?.id ?? null}
          onRegister={registerPlatformUser}
          onUpdate={updatePlatformUser}
          onDelete={deletePlatformUser}
        />
        <AdminMasterDataPanel
          masterData={masterData}
          mandatoryQuestions={mandatoryQuestions}
          onAddMasterItem={addMasterDataItem}
          onUpdateMasterItem={updateMasterDataItem}
          onDeleteMasterItem={deleteMasterDataItem}
          onAddMandatoryQuestion={addMandatoryQuestion}
          onUpdateMandatoryQuestion={updateMandatoryQuestion}
          onDeleteMandatoryQuestion={deleteMandatoryQuestion}
        />
      </div>
    </div>
  )
}
