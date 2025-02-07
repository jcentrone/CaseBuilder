import React from 'react'
import {Calendar, dateFnsLocalizer} from 'react-big-calendar'
import {format, getDay, parse, startOfWeek} from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css' // import default styles
import enUS from 'date-fns/locale/en-US'
import {Box} from '@mui/material';


const locales = {
    'en-US': enUS
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales
})

async function loadEvents() {
    // for each case, if it has a "nextDate" or "hearingDate", create { start, end, title }
    const allCases = await window.electronAPI.cases.getAll()

    const events = allCases.map(c => ({
        start: new Date(c.dateOpened), // or c.nextCourtDate
        end: new Date(c.dateOpened),
        title: c.caseName
    }))

    setEvents(events)
}

export default function CalendarPage() {
    const [events, setEvents] = React.useState([])

    // Possibly load events from DB, or from cases' next dates, etc.
    React.useEffect(() => {
        // fetch relevant data, transform into event objects: { start, end, title }
        const mock = [
            {start: new Date(), end: new Date(), title: 'Today!'}
        ]
        setEvents(mock)
    }, [])

    return (
        <Box sx={{p: 3, height: '100%'}}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{height: '100%'}}
            />
        </Box>
    )
}
