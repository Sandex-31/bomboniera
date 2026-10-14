package catering.businesslogic.list;

/**
 * Observer interface for staff-related events.
 * Implementations get notified when staff members are hired, fired, edited, 
 * or assigned to events.
 */
public interface ListEventReceiver {

    void updateStaffHired(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays);

    void updateStaffFired(String taxID);

    void updateStaffEdited(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays);

    void updateStaffAddedToEvent(String taxID, int eventID);

    void updateStaffRemovedFromEvent(String taxID, int eventID);

    void updateStaffBusyStatusChanged(String taxID, boolean busy);

    void updateStaffVacationDaysEdited(String taxID, int vacationDays);
}