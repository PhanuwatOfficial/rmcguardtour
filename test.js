/*
        function getScheduleDaysText(days, holidayDates) {
            // ถ้าไม่มีวันปกติและไม่มีวันหยุดพิเศษ = ไม่ได้กำหนด
            if ((!days || days.length === 0) && (!holidayDates || holidayDates.length === 0)) {
                return '-';
            }

            const dayMap = {
                'mon': 'จันทร์',
                'tue': 'อังคาร',
                'wed': 'พุธ',
                'thu': 'พฤหัส',
                'fri': 'ศุกร์',
                'sat': 'เสาร์',
                'sun': 'อาทิตย์'
            };

            let result = '';

            // แสดงวันปกติ (ถ้ามี)
            if (days && days.length > 0) {
                const dayBadges = days.map(day =>
                    `<span class="schedule-day-badge">${dayMap[day]}</span>`
                ).join('');
                result = dayBadges;
            }

            // แสดงวันหยุดพิเศษ (ถ้ามี)
            if (holidayDates && holidayDates.length > 0) {
                const holidayBadges = holidayDates.map(date =>
                    `<span class="schedule-holiday-badge">${date}</span>`
                ).join('');

                if (result) {
                    result += `<span class="schedule-separator">+</span>${holidayBadges}`;
                } else {
                    result = holidayBadges;
                }
            }

            return result || '-';
        }
        // Render Scan Records Table
        function renderScanRecordsTable() {
            const tableContainer = document.getElementById('records-table-body');
            const cardContainer = document.getElementById('records-card-body');
            tableContainer.innerHTML = '';
            cardContainer.innerHTML = '';

            if (!schedules.length || !checkpoints.length) {
                tableContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูล</td></tr>`;
                cardContainer.innerHTML = `<div style="text-align:center; color:#888; padding:1em;">ไม่มีข้อมูล</div>`;
                return;
            }

            // รวบรวมวันที่ทั้งหมดจาก scanRecords
            const dateSet = new Set();
            scanRecords.forEach(rec => {
                const recDate = new Date(rec.timestamp);
                const yyyy = recDate.getFullYear();
                const mm = String(recDate.getMonth() + 1).padStart(2, '0');
                const dd = String(recDate.getDate()).padStart(2, '0');
                dateSet.add(`${yyyy}-${mm}-${dd}`);
            });
            const allDates = Array.from(dateSet).map(d => new Date(d)).sort((a, b) => b - a); // ใหม่สุดก่อน

            let hasData = false;
            const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            allDates.forEach(dateObj => {
                const dateStr = formatDate(dateObj);
                let daySchedules = getDaySchedules(dateObj);

                // แสดงรอบวันนี้ และรอบเมื่อวานที่จบวันนี้
                daySchedules = daySchedules.filter(sch => {
                    if (sch._startDate === dateStr) return true;
                    if (sch._startDate < dateStr) {
                        return sch._hasSpan && sch._endDate === dateStr;
                    }
                    return false;
                });

                // ลบ duplicate
                daySchedules = daySchedules.filter((sch, idx, arr) =>
                    arr.findIndex(s => s.id === sch.id && s._startDate === sch._startDate && s._endDate === sch._endDate) === idx
                );

                if (daySchedules.length === 0) return;

                // เรียงตามเวลา Start Time
                const sortedSchedules = [...daySchedules].sort((a, b) => {
                    const timeA = a._startDate + 'T' + a.startTime;
                    const timeB = b._startDate + 'T' + b.startTime;
                    return timeA.localeCompare(timeB);
                });

                sortedSchedules.forEach(schedule => {
                    // --- NEW: Split schedule into hourly intervals ---
                    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

                    let startTime = new Date(schedule._startDate);
                    startTime.setHours(startHour, startMin, 0, 0);
                    let endTime = new Date(schedule._endDate);
                    endTime.setHours(endHour, endMin, 0, 0);
                    if (endTime <= startTime) {
                        endTime.setDate(startTime.getDate() + 1);
                        endTime.setHours(endHour, endMin, 0, 0);
                    }

                    let intervalStart = new Date(startTime);
                    while (intervalStart < endTime) {
                        let intervalEnd = new Date(intervalStart);
                        intervalEnd.setHours(intervalEnd.getHours() + 1);
                        if (intervalEnd > endTime) intervalEnd = new Date(endTime);

                        // --- แก้ไขตรงนี้: ให้ header แสดงวันที่ของ intervalStart ---
                        const intervalDateStr = intervalStart.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const isoDateStr = intervalStart.toISOString().split('T')[0];
                        const intervalStartStr = intervalStart.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                        const intervalEndStr = intervalEnd.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                        const groupRow = document.createElement('tr');
                        groupRow.className = 'schedule-row-title';
                        groupRow.innerHTML = `<td colspan="7" style="background:#f0f4ff; font-weight:bold; color:#2E5AAC;" data-iso-date="${isoDateStr}">
                    <i class="fas fa-history"></i> ${intervalDateStr} - ${schedule.name} (${intervalStartStr} - ${intervalEndStr})
                </td>`;
                        tableContainer.appendChild(groupRow);

                        const scheduleCardHead = document.createElement('div');
                        scheduleCardHead.className = 'card';
                        scheduleCardHead.style.cssText = "background:#e3eaff; font-weight:bold; color:#2E5AAC; margin-bottom:0.5rem; padding:8px;";
                        scheduleCardHead.innerHTML = `<div><i class="fas fa-clock"></i> ${schedule._startDate} - ${schedule.name} (${intervalStartStr} - ${intervalEndStr})</div>`;
                        cardContainer.appendChild(scheduleCardHead);

                        // Checkpoints
                        (schedule.checkpoints || []).forEach(checkpointId => {
                            const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
                            if (!checkpoint) return;

                            const startTimestamp = intervalStart.getTime();
                            const endTimestamp = intervalEnd.getTime();
                            const gracePeriod = 60 * 60 * 1000;

                            const record = scanRecords.find(rec => {
                                if (rec.checkpointId !== checkpointId) return false;
                                return rec.timestamp >= startTimestamp && rec.timestamp <= (endTimestamp + gracePeriod);
                            });

                            let status = '<span class="status-pending">รอดำเนินการ</span>';
                            let statusClass = 'status-pending';
                            let scanTime = '-';
                            let note = '-';
                            let user = '-';
                            let imageUrl = '';

                            if (Date.now() > endTimestamp && (!record || record.timestamp > endTimestamp)) {
                                status = '<span class="status-missed">ไม่ได้ดำเนินการ</span>';
                                statusClass = 'status-missed';
                            } else if (record) {
                                const recDate = new Date(record.timestamp);
                                scanTime = recDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                user = record.scannedBy || '-';
                                note = record.notes || '-';
                                imageUrl = record.imageUrl || '';

                                if (record.timestamp <= endTimestamp) {
                                    status = '<span class="status-on-time">ตรวจภายในเวลา</span>';
                                    statusClass = 'status-on-time';
                                } else {
                                    status = '<span class="status-missed">เกินกำหนดเวลา</span>';
                                    statusClass = 'status-missed';
                                }
                            }

                            const imageHtml = imageUrl
                                ? `<img src="${imageUrl}" class="scan-record-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="showScanImageModal('${imageUrl}')">`
                                : `<span style="color:#ccc;">ไม่มีรูป</span>`;

                            const row = document.createElement('tr');
                            row.className = 'schedule-row-group';
                            row.innerHTML = `
                    <td>${scanTime}</td>
                    <td>${checkpoint.name}</td>
                    <td>${status}</td>
                    <td>${note}</td>
                    <td>${user}</td>
                    <td style="text-align:center;">${imageHtml}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-danger btn-sm hide-for-non-admin" onclick="handleDeleteRecord('${record ? record.id : ''}')" ${!record ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                            tableContainer.appendChild(row);

                            const card = document.createElement('div');
                            card.className = 'card';
                            card.style.marginBottom = '0.5rem';
                            card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:5px;">
                        <span style="color:#666;"><i class="fas fa-map-marker-alt"></i> ${checkpoint.name}</span>
                        <span class="${statusClass}">${status.replace(/<[^>]+>/g, '')}</span>
                    </div>
                    <div style="font-size:0.9rem;"><strong>เวลาสแกน:</strong> ${scanTime} | <strong>ผู้ตรวจ:</strong> ${user}</div>
                    ${note !== '-' && note !== '' ? `<div style="font-size:0.85rem; color:#555;"><strong>โน้ต:</strong> ${note}</div>` : ''}
                    ${imageUrl ? `<img src="${imageUrl}" style="width:100%; max-height:150px; object-fit:cover; margin-top:8px; border-radius:4px;" onclick="showScanImageModal('${imageUrl}')">` : ''}
                `;
                            cardContainer.appendChild(card);

                            hasData = true;
                        });

                        intervalStart = intervalEnd;
                    }
                });
            });

            if (!hasData) {
                tableContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูลที่เกี่ยวข้องในขณะนี้</td></tr>`;
                cardContainer.innerHTML = `<div style="text-align:center; color:#888; padding:1em;">ไม่มีข้อมูลที่เกี่ยวข้องในขณะนี้</div>`;
            }
        }
        // เพิ่มใน initializeEventListeners() - with null checks
        const recordsStartDate = document.getElementById('records-start-date');
        const recordsEndDate = document.getElementById('records-end-date');
        const recordsStartTime = document.getElementById('records-start-time');
        const recordsEndTime = document.getElementById('records-end-time');
        const recordsResetBtn = document.getElementById('records-reset-btn');

        if (recordsStartDate) recordsStartDate.addEventListener('change', autoFilterScanRecords);
        if (recordsEndDate) recordsEndDate.addEventListener('change', autoFilterScanRecords);
        if (recordsStartTime) recordsStartTime.addEventListener('change', autoFilterScanRecords);
        if (recordsEndTime) recordsEndTime.addEventListener('change', autoFilterScanRecords);
        if (recordsResetBtn) recordsResetBtn.addEventListener('click', resetScanRecordsFilter);


        function autoFilterScanRecords() {
            const startDateInput = document.getElementById('records-start-date').value;
            const endDateInput = document.getElementById('records-end-date').value;
            const startTimeInput = document.getElementById('records-start-time').value;
            const endTimeInput = document.getElementById('records-end-time').value;

            const hasTime = startTimeInput || endTimeInput;

            // ถ้าไม่ได้เลือกวันที่และเวลาใดเลย → แสดงทั้งหมด
            if (!startDateInput && !endDateInput && !startTimeInput && !endTimeInput) {
                renderScanRecordsTable();
                return;
            }

            // กำหนด start datetime
            let start;
            if (startDateInput) {
                start = new Date(startDateInput);
                if (startTimeInput) {
                    const [h, m] = startTimeInput.split(':').map(Number);
                    start.setHours(h, m, 0, 0);
                } else {
                    start.setHours(0, 0, 0, 0);
                }
            } else {
                start = new Date();
                if (startTimeInput) {
                    const [h, m] = startTimeInput.split(':').map(Number);
                    start.setHours(h, m, 0, 0);
                } else {
                    start.setHours(0, 0, 0, 0);
                }
            }

            // กำหนด end datetime
            let end;
            if (endDateInput) {
                end = new Date(endDateInput);
                if (endTimeInput) {
                    const [h, m] = endTimeInput.split(':').map(Number);
                    end.setHours(h, m, 59, 999);
                } else {
                    end.setHours(23, 59, 59, 999);
                }
            } else {
                end = new Date();
                if (endTimeInput) {
                    const [h, m] = endTimeInput.split(':').map(Number);
                    end.setHours(h, m, 59, 999);
                } else {
                    end.setHours(23, 59, 59, 999);
                }
            }

            if (hasTime) {
                // โหมดกรองด้วยเวลา: ไม่สนใจรอบข้ามคืน ใช้ช่วงเวลาตรงๆ
                renderScanRecordsTableByTimeRange(start, end);
            } else {
                // โหมดกรองแค่วันที่: ใช้ logic รอบข้ามคืนเดิม
                const dateList = [];
                let d = new Date(start);
                while (d <= end) {
                    dateList.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
                renderScanRecordsTableByDateRange(dateList, start);
            }
        }

        function resetScanRecordsFilter() {
            document.getElementById('records-start-date').value = '';
            document.getElementById('records-end-date').value = '';
            document.getElementById('records-start-time').value = '';
            document.getElementById('records-end-time').value = '';
            renderScanRecordsTable();
        }
       
        function getDaySchedules(dateObj) {
            const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dateObj.getDay()];
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            let result = [];

            // 1. ดึงรอบที่เป็น Holiday ของวันนี้
            const holidaySchedules = schedules.filter(sch =>
                Array.isArray(sch.holidayDates) && sch.holidayDates.includes(dateStr)
            );
            if (holidaySchedules.length > 0) {
                holidaySchedules.forEach(sch => {
                    result.push({
                        ...sch,
                        _startDate: dateStr,
                        _endDate: dateStr,
                        _hasSpan: false,
                        _dateStr: dateStr
                    });
                });
            }

            // 2. ดึงรอบปกติของวันนี้ (เฉพาะวันที่ไม่ใช่ Holiday หรือถ้าอยากให้แสดงคู่กันก็เอา if ออกได้)
            // ในที่นี้สมมติว่าถ้ามี Holiday จะไม่เอารอบปกติของ "วันเสาร์" มาแสดง
            if (holidaySchedules.length === 0) {
                schedules.forEach(sch => {
                    if (!sch.days || !sch.days.includes(dayOfWeek)) return;
                    const [startHour, startMin] = sch.startTime.split(':').map(Number);
                    const [endHour, endMin] = sch.endTime.split(':').map(Number);

                    if (startHour < endHour || (startHour === endHour && startMin < endMin)) {
                        result.push({ ...sch, _startDate: dateStr, _endDate: dateStr, _hasSpan: false, _dateStr: dateStr });
                    } else {
                        // รอบลากยาว (ข้ามคืน)
                        result.push({
                            ...sch,
                            _startDate: dateStr,
                            _endDate: dateStr, // จะถูกแก้ในขั้นตอนถัดไปหรือตอนคำนวณ timestamp
                            _hasSpan: true,
                            _dateStr: dateStr,
                            _isFirstPart: true
                        });
                    }
                });
            }

            // 3. *** ส่วนสำคัญ *** ดึงรอบที่ "เริ่มจากเมื่อวาน" แล้วลากมาจบ "วันนี้"
            const prevDateObj = new Date(dateObj);
            prevDateObj.setDate(dateObj.getDate() - 1);
            const prevDayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][prevDateObj.getDay()];
            const prevDateStr = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}-${String(prevDateObj.getDate()).padStart(2, '0')}`;

            schedules.forEach(sch => {
                // เช็คว่าเมื่อวานเป็นวันทำงานของกะนี้ไหม (หรือเมื่อวานเป็น holiday ของกะนี้ไหม)
                const workedYesterday = (sch.days && sch.days.includes(prevDayOfWeek)) ||
                    (sch.holidayDates && sch.holidayDates.includes(prevDateStr));

                if (!workedYesterday) return;

                const [sH, sM] = sch.startTime.split(':').map(Number);
                const [eH, eM] = sch.endTime.split(':').map(Number);

                // ถ้ากะเมื่อวานเป็นกะข้ามคืน
                if (eH < sH || (eH === sH && eM <= sM)) {
                    result.push({
                        ...sch,
                        _startDate: prevDateStr,
                        _endDate: dateStr,
                        _hasSpan: true,
                        _dateStr: dateStr, // เพื่อให้ฟังก์ชัน render มองเห็นในกลุ่มของ "วันนี้"
                        _isSecondPart: true
                    });
                }
            });

            return result;
        }

        function renderScanRecordsTableByDateRange(dateList, filterStartDate) {
            const tableContainer = document.getElementById('records-table-body');
            const cardContainer = document.getElementById('records-card-body');
            tableContainer.innerHTML = '';
            cardContainer.innerHTML = '';

            if (!schedules.length || !checkpoints.length) {
                tableContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูล</td></tr>`;
                cardContainer.innerHTML = `<div style="text-align:center; color:#888; padding:1em;">ไม่มีข้อมูล</div>`;
                return;
            }

            let hasData = false;
            dateList.sort((a, b) => b - a);

            const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const filterStartStr = formatDate(new Date(filterStartDate));

            dateList.forEach(dateObj => {
                const dateStr = formatDate(dateObj);
                let daySchedules = getDaySchedules(dateObj);

                daySchedules = daySchedules.filter(sch => {
                    if (sch._startDate === filterStartStr) return true;
                    if (sch._startDate < filterStartStr) {
                        return sch._hasSpan && sch._endDate === filterStartStr;
                    }
                    return false;
                });

                daySchedules = daySchedules.filter((sch, idx, arr) =>
                    arr.findIndex(s => s.id === sch.id && s._startDate === sch._startDate && s._endDate === sch._endDate) === idx
                );

                if (daySchedules.length === 0) return;

                const sortedSchedules = [...daySchedules].sort((a, b) => {
                    const timeA = a._startDate + 'T' + a.startTime;
                    const timeB = b._startDate + 'T' + b.startTime;
                    return timeA.localeCompare(timeB);
                });

                sortedSchedules.forEach(schedule => {
                    // --- NEW: Split schedule into hourly intervals ---
                    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
                    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

                    let startTime = new Date(schedule._startDate);
                    startTime.setHours(startHour, startMin, 0, 0);
                    let endTime = new Date(schedule._endDate);
                    endTime.setHours(endHour, endMin, 0, 0);
                    if (endTime <= startTime) {
                        endTime.setDate(startTime.getDate() + 1);
                        endTime.setHours(endHour, endMin, 0, 0);
                    }

                    let intervalStart = new Date(startTime);
                    while (intervalStart < endTime) {
                        let intervalEnd = new Date(intervalStart);
                        intervalEnd.setHours(intervalEnd.getHours() + 1);
                        if (intervalEnd > endTime) intervalEnd = new Date(endTime);

                        // --- แก้ไขตรงนี้: ให้ header แสดงวันที่ของ intervalStart ---
                        const intervalDateStr = intervalStart.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const isoDateStr = intervalStart.toISOString().split('T')[0];
                        const intervalStartStr = intervalStart.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                        const intervalEndStr = intervalEnd.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                        const groupRow = document.createElement('tr');
                        groupRow.className = 'schedule-row-title';
                        groupRow.innerHTML = `<td colspan="7" style="background:#f0f4ff; font-weight:bold; color:#2E5AAC;" data-iso-date="${isoDateStr}">
                    <i class="fas fa-history"></i> ${intervalDateStr} - ${schedule.name} (${intervalStartStr} - ${intervalEndStr})
                </td>`;
                        tableContainer.appendChild(groupRow);

                        const scheduleCardHead = document.createElement('div');
                        scheduleCardHead.className = 'card';
                        scheduleCardHead.style.cssText = "background:#e3eaff; font-weight:bold; color:#2E5AAC; margin-bottom:0.5rem; padding:8px;";
                        scheduleCardHead.innerHTML = `<div><i class="fas fa-clock"></i> ${schedule._startDate} - ${schedule.name} (${intervalStartStr} - ${intervalEndStr})</div>`;
                        cardContainer.appendChild(scheduleCardHead);

                        (schedule.checkpoints || []).forEach(checkpointId => {
                            const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
                            if (!checkpoint) return;

                            const startTimestamp = intervalStart.getTime();
                            const endTimestamp = intervalEnd.getTime();
                            const gracePeriod = 60 * 60 * 1000;

                            const record = scanRecords.find(rec => {
                                if (rec.checkpointId !== checkpointId) return false;
                                return rec.timestamp >= startTimestamp && rec.timestamp <= (endTimestamp + gracePeriod);
                            });

                            let status = '<span class="status-pending">รอดำเนินการ</span>';
                            let statusClass = 'status-pending';
                            let scanTime = '-';
                            let note = '-';
                            let user = '-';
                            let imageUrl = '';

                            if (Date.now() > endTimestamp && (!record || record.timestamp > endTimestamp)) {
                                status = '<span class="status-missed">ไม่ได้ดำเนินการ</span>';
                                statusClass = 'status-missed';
                            } else if (record) {
                                const recDate = new Date(record.timestamp);
                                scanTime = recDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                user = record.scannedBy || '-';
                                note = record.notes || '-';
                                imageUrl = record.imageUrl || '';

                                if (record.timestamp <= endTimestamp) {
                                    status = '<span class="status-on-time">ตรวจภายในเวลา</span>';
                                    statusClass = 'status-on-time';
                                } else {
                                    status = '<span class="status-missed">เกินกำหนดเวลา</span>';
                                    statusClass = 'status-missed';
                                }
                            }

                            const imageHtml = imageUrl
                                ? `<img src="${imageUrl}" class="scan-record-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="showScanImageModal('${imageUrl}')">`
                                : `<span style="color:#ccc;">ไม่มีรูป</span>`;

                            const row = document.createElement('tr');
                            row.className = 'schedule-row-group';
                            row.innerHTML = `
                    <td>${scanTime}</td>
                    <td>${checkpoint.name}</td>
                    <td>${status}</td>
                    <td>${note}</td>
                    <td>${user}</td>
                    <td style="text-align:center;">${imageHtml}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-danger btn-sm hide-for-non-admin" onclick="handleDeleteRecord('${record ? record.id : ''}')" ${!record ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                            tableContainer.appendChild(row);

                            const card = document.createElement('div');
                            card.className = 'card';
                            card.style.marginBottom = '0.5rem';
                            card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:5px;">
                        <span style="color:#666;"><i class="fas fa-map-marker-alt"></i> ${checkpoint.name}</span>
                        <span class="${statusClass}">${status.replace(/<[^>]+>/g, '')}</span>
                    </div>
                    <div style="font-size:0.9rem;"><strong>เวลาสแกน:</strong> ${scanTime} | <strong>ผู้ตรวจ:</strong> ${user}</div>
                    ${note !== '-' && note !== '' ? `<div style="font-size:0.85rem; color:#555;"><strong>โน้ต:</strong> ${note}</div>` : ''}
                    ${imageUrl ? `<img src="${imageUrl}" style="width:100%; max-height:150px; object-fit:cover; margin-top:8px; border-radius:4px;" onclick="showScanImageModal('${imageUrl}')">` : ''}
                `;
                            cardContainer.appendChild(card);

                            hasData = true;
                        });

                        intervalStart = intervalEnd;
                    }
                });
            });

            if (!hasData) {
                tableContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูลที่เกี่ยวข้องในขณะนี้</td></tr>`;
                cardContainer.innerHTML = `<div style="text-align:center; color:#888; padding:1em;">ไม่มีข้อมูลที่เกี่ยวข้องในขณะนี้</div>`;
            }
        }

                function renderScanRecordsTableByTimeRange(filterStart, filterEnd) {
            const tableContainer = document.getElementById('records-table-body');
            const cardContainer = document.getElementById('records-card-body');
            tableContainer.innerHTML = '';
            cardContainer.innerHTML = '';

            if (!schedules.length || !checkpoints.length) {
                tableContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูล</td></tr>`;
                cardContainer.innerHTML = `<div style="text-align:center; color:#888; padding:1em;">ไม่มีข้อมูล</div>`;
                return;
            }

            const formatDate = (d) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            // สร้าง list วันที่ใน range
            const dateList = [];
            let d = new Date(filterStart);
            d.setHours(0, 0, 0, 0);
            const endDay = new Date(filterEnd);
            endDay.setHours(23, 59, 59, 999);
            while (d <= endDay) {
                dateList.push(new Date(d));
                d.setDate(d.getDate() + 1);
            }
            dateList.sort((a, b) => b - a); // ใหม่สุดก่อน

            let hasData = false;

            dateList.forEach(dateObj => {
                const dateStr = formatDate(dateObj);
                const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dateObj.getDay()];

                // ดึงรอบที่ตรงกับวันนี้ และรอบข้ามคืนจากเมื่อวาน
                let daySchedules = [];

                // 1. ดึงรอบของวันนี้
                schedules.forEach(sch => {
                    const isHoliday = Array.isArray(sch.holidayDates) && sch.holidayDates.includes(dateStr);
                    const isWeekday = sch.days && sch.days.includes(dayOfWeek);
                    if (!isHoliday && !isWeekday) return;

                    const [sH, sM] = sch.startTime.split(':').map(Number);
                    const [eH, eM] = sch.endTime.split(':').map(Number);

                    let schStart = new Date(dateStr);
                    schStart.setHours(sH, sM, 0, 0);
                    let schEnd = new Date(dateStr);
                    schEnd.setHours(eH, eM, 0, 0);

                    // รอบข้ามคืน: ขยาย endTime ไปวันถัดไป
                    if (schEnd <= schStart) {
                        schEnd.setDate(schEnd.getDate() + 1);
                    }

                    // ตรวจว่า schedule ตัดกับ filterStart–filterEnd ไหม
                    if (schEnd <= filterStart || schStart >= filterEnd) return;

                    daySchedules.push({
                        ...sch,
                        _startDate: dateStr,
                        _endDate: formatDate(schEnd),
                        _hasSpan: schEnd.getDate() !== schStart.getDate(),
                        _dateStr: dateStr,
                        _schStartTs: schStart.getTime(),
                        _schEndTs: schEnd.getTime(),
                    });
                });

                // 2. ดึงรอบข้ามคืนจากเมื่อวานที่จบในวันนี้
                const prevDateObj = new Date(dateObj);
                prevDateObj.setDate(dateObj.getDate() - 1);
                const prevDayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][prevDateObj.getDay()];
                const prevDateStr = formatDate(prevDateObj);

                schedules.forEach(sch => {
                    // ตรวจสอบว่าเมื่อวานเป็นวันทำงานของกะนี้ไหม
                    const isHolidayYesterday = Array.isArray(sch.holidayDates) && sch.holidayDates.includes(prevDateStr);
                    const isWeekdayYesterday = sch.days && sch.days.includes(prevDayOfWeek);
                    if (!isHolidayYesterday && !isWeekdayYesterday) return;

                    const [sH, sM] = sch.startTime.split(':').map(Number);
                    const [eH, eM] = sch.endTime.split(':').map(Number);

                    // ตรวจว่าเป็นรอบข้ามคืน
                    if (!(eH < sH || (eH === sH && eM <= sM))) return;

                    // สร้าง schedule timestamps สำหรับเมื่อวาน
                    let schStart = new Date(prevDateStr);
                    schStart.setHours(sH, sM, 0, 0);
                    let schEnd = new Date(prevDateStr);
                    schEnd.setHours(eH, eM, 0, 0);
                    schEnd.setDate(schEnd.getDate() + 1); // ส่วนที่จบวันถัดไป

                    // ตรวจว่า schedule ตัดกับ filterStart–filterEnd ไหม
                    if (schEnd <= filterStart || schStart >= filterEnd) return;

                    daySchedules.push({
                        ...sch,
                        _startDate: prevDateStr,
                        _endDate: dateStr,
                        _hasSpan: true,
                        _dateStr: dateStr,
                        _schStartTs: schStart.getTime(),
                        _schEndTs: schEnd.getTime(),
                    });
                });

                // ลบ duplicate
                daySchedules = daySchedules.filter((sch, idx, arr) =>
                    arr.findIndex(s => s.id === sch.id && s._startDate === sch._startDate) === idx
                );

                if (daySchedules.length === 0) return;

                daySchedules.sort((a, b) => a._schStartTs - b._schStartTs);

                daySchedules.forEach(schedule => {
                    let startTime = new Date(schedule._schStartTs);
                    let endTime = new Date(schedule._schEndTs);

                    // ตัด interval ให้อยู่ใน filterStart–filterEnd
                    const clampedStart = new Date(Math.max(startTime.getTime(), filterStart.getTime()));
                    const clampedEnd = new Date(Math.min(endTime.getTime(), filterEnd.getTime()));

                    // แบ่งเป็น hourly intervals ภายใน clamped range
                    let intervalStart = new Date(clampedStart);
                    // snap intervalStart ให้เริ่มต้นที่ต้นชั่วโมง (ตาม original schedule)
                    // หาก filterStart ไม่ตรงกับต้นชั่วโมง ให้ขยับ intervalStart ไปที่ชั่วโมงถัดไปที่ตรงกับ schedule
                    const schStartMin = startTime.getMinutes();
                    if (intervalStart.getMinutes() !== schStartMin ||
                        intervalStart.getSeconds() !== 0) {
                        // เริ่ม interval จาก filterStart ตรงๆ (partial interval แรก)
                    }

                    while (intervalStart < clampedEnd) {
                        let intervalEnd = new Date(intervalStart);
                        intervalEnd.setHours(intervalEnd.getHours() + 1);
                        // snap to schedule's minute boundary
                        intervalEnd.setMinutes(startTime.getMinutes(), 0, 0);
                        if (intervalEnd <= intervalStart) {
                            intervalEnd.setHours(intervalEnd.getHours() + 1);
                        }
                        if (intervalEnd > clampedEnd) intervalEnd = new Date(clampedEnd);

                        const intervalDateStr = intervalStart.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const isoDateStr = intervalStart.toISOString().split('T')[0];
                        const intervalStartStr = intervalStart.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                        const intervalEndStr = intervalEnd.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                        const groupRow = document.createElement('tr');
                        groupRow.className = 'schedule-row-title';
                        groupRow.innerHTML = `<td colspan="7" style="background:#f0f4ff; font-weight:bold; color:#2E5AAC;" data-iso-date="${isoDateStr}">
                    <i class="fas fa-history"></i> ${intervalDateStr} - ${schedule.name} (${intervalStartStr} - ${intervalEndStr})
                </td>`;
                        tableContainer.appendChild(groupRow);

                        const scheduleCardHead = document.createElement('div');
                        scheduleCardHead.className = 'card';
                        scheduleCardHead.style.cssText = "background:#e3eaff; font-weight:bold; color:#2E5AAC; margin-bottom:0.5rem; padding:8px;";
                        scheduleCardHead.innerHTML = `<div><i class="fas fa-clock"></i> ${schedule._startDate} - ${schedule.name} (${intervalStartStr} - ${intervalEndStr})</div>`;
                        cardContainer.appendChild(scheduleCardHead);

                        (schedule.checkpoints || []).forEach(checkpointId => {
                            const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
                            if (!checkpoint) return;

                            const startTimestamp = intervalStart.getTime();
                            const endTimestamp = intervalEnd.getTime();
                            const gracePeriod = 60 * 60 * 1000;

                            const record = scanRecords.find(rec => {
                                if (rec.checkpointId !== checkpointId) return false;
                                return rec.timestamp >= startTimestamp && rec.timestamp <= (endTimestamp + gracePeriod);
                            });

                            let status = '<span class="status-pending">รอดำเนินการ</span>';
                            let statusClass = 'status-pending';
                            let scanTime = '-';
                            let note = '-';
                            let user = '-';
                            let imageUrl = '';

                            if (Date.now() > endTimestamp && (!record || record.timestamp > endTimestamp)) {
                                status = '<span class="status-missed">ไม่ได้ดำเนินการ</span>';
                                statusClass = 'status-missed';
                            } else if (record) {
                                const recDate = new Date(record.timestamp);
                                scanTime = recDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                user = record.scannedBy || '-';
                                note = record.notes || '-';
                                imageUrl = record.imageUrl || '';

                                if (record.timestamp <= endTimestamp) {
                                    status = '<span class="status-on-time">ตรวจภายในเวลา</span>';
                                    statusClass = 'status-on-time';
                                } else {
                                    status = '<span class="status-missed">เกินกำหนดเวลา</span>';
                                    statusClass = 'status-missed';
                                }
                            }

                            const imageHtml = imageUrl
                                ? `<img src="${imageUrl}" class="scan-record-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="showScanImageModal('${imageUrl}')">`
                                : `<span style="color:#ccc;">ไม่มีรูป</span>`;

                            const row = document.createElement('tr');
                            row.className = 'schedule-row-group';
                            row.innerHTML = `
                        <td>${scanTime}</td>
                        <td>${checkpoint.name}</td>
                        <td>${status}</td>
                        <td>${note}</td>
                        <td>${user}</td>
                        <td style="text-align:center;">${imageHtml}</td>
                        <td style="text-align:center;">
                            <button class="btn btn-danger btn-sm hide-for-non-admin" onclick="handleDeleteRecord('${record ? record.id : ''}')" ${!record ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                            tableContainer.appendChild(row);

                            const card = document.createElement('div');
                            card.className = 'card';
                            card.style.marginBottom = '0.5rem';
                            card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:5px;">
                            <span style="color:#666;"><i class="fas fa-map-marker-alt"></i> ${checkpoint.name}</span>
                            <span class="${statusClass}">${status.replace(/<[^>]+>/g, '')}</span>
                        </div>
                        <div style="font-size:0.9rem;"><strong>เวลาสแกน:</strong> ${scanTime} | <strong>ผู้ตรวจ:</strong> ${user}</div>
                        ${note !== '-' && note !== '' ? `<div style="font-size:0.85rem; color:#555;"><strong>โน้ต:</strong> ${note}</div>` : ''}
                        ${imageUrl ? `<img src="${imageUrl}" style="width:100%; max-height:150px; object-fit:cover; margin-top:8px; border-radius:4px;" onclick="showScanImageModal('${imageUrl}')">` : ''}
                    `;
                            cardContainer.appendChild(card);

                            hasData = true;
                        });

                        intervalStart = intervalEnd;
                    }
                });
            });

            if (!hasData) {
                tableContainer.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูลที่เกี่ยวข้องในขณะนี้</td></tr>`;
                cardContainer.innerHTML = `<div style="text-align:center; color:#888; padding:1em;">ไม่มีข้อมูลที่เกี่ยวข้องในขณะนี้</div>`;
            }
        }



                document.getElementById('records-export-btn').addEventListener('click', async function () {
            const btn = this;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเตรียมส่งออก...';
            btn.disabled = true;

            try {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Records');

                // ตั้งค่าหัวข้อคอลัมน์
                worksheet.columns = [
                    { header: 'วันที่', key: 'date', width: 12 },
                    { header: 'เวลาเริ่มรอบ', key: 'scheduleStart', width: 12 },
                    { header: 'เวลาสิ้นสุดรอบ', key: 'scheduleEnd', width: 12 },
                    { header: 'เวลาที่ตรวจ', key: 'scanTime', width: 10 },
                    { header: 'จุดตรวจ', key: 'checkpoint', width: 20 },
                    { header: 'สถานะ', key: 'status', width: 15 },
                    { header: 'หมายเหตุ', key: 'notes', width: 20 },
                    { header: 'ผู้ตรวจ', key: 'user', width: 25 },
                    { header: 'รูปภาพ', key: 'image', width: 15 }
                ];

                // จัดรูปแบบหัวข้อ
                worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5AAC' } };
                worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };

                // รวบรวมข้อมูล
                let lastDate = '';
                let currentScheduleTime = { start: '', end: '' };
                const recordsData = [];

                document.querySelectorAll('#records-table-body tr').forEach(tr => {
                    if (tr.classList.contains('schedule-row-title')) {
                        const text = tr.innerText.trim();
                        const td = tr.querySelector('td');
                        const isoDate = td ? td.getAttribute('data-iso-date') : null;
                        const timeMatch = text.match(/\((\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\)/);

                        if (isoDate) {
                            lastDate = isoDate;
                        }
                        if (timeMatch) {
                            currentScheduleTime.start = timeMatch[1];
                            currentScheduleTime.end = timeMatch[2];
                        }
                    } else if (tr.classList.contains('schedule-row-group')) {
                        const cells = tr.querySelectorAll('td');
                        if (cells.length >= 6) {
                            const scanTime = cells[0].innerText.trim();
                            const checkpointName = cells[1].innerText.trim();
                            const status = cells[2].innerText.replace(/<[^>]+>/g, '').trim();
                            const notes = cells[3].innerText.trim();
                            const scannedBy = cells[4].innerText.trim();
                            const imageCell = cells[5];
                            const imageUrl = imageCell.querySelector('img')?.src || '';

                            recordsData.push({
                                date: lastDate,
                                scheduleStart: currentScheduleTime.start,
                                scheduleEnd: currentScheduleTime.end,
                                scanTime: scanTime,
                                checkpoint: checkpointName,
                                status: status,
                                notes: notes,
                                user: scannedBy,
                                imageUrl: imageUrl
                            });
                        }
                    }
                });

                if (recordsData.length === 0) {
                    alert('ไม่มีข้อมูลสำหรับส่งออก');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }

                // เพิ่มข้อมูลลงในแถว พร้อมกับรูปภาพ
                for (let i = 0; i < recordsData.length; i++) {
                    const data = recordsData[i];
                    const row = worksheet.addRow({
                        date: data.date,
                        scheduleStart: data.scheduleStart,
                        scheduleEnd: data.scheduleEnd,
                        scanTime: data.scanTime,
                        checkpoint: data.checkpoint,
                        status: data.status,
                        notes: data.notes,
                        user: data.user
                    });

                    // เพิ่มรูปภาพ (ถ้ามี)
                    if (data.imageUrl) {
                        try {
                            const imageResponse = await fetch(data.imageUrl);
                            const imageBlob = await imageResponse.blob();
                            const reader = new FileReader();

                            reader.onload = function (e) {
                                try {
                                    const imageData = e.target.result;
                                    const base64Data = imageData.split(',')[1];

                                    if (base64Data) {
                                        const imageId = workbook.addImage({
                                            base64: base64Data,
                                            extension: 'jpeg'
                                        });

                                        worksheet.addImage(imageId, {
                                            tl: { col: 8, row: row.number - 1 },
                                            ext: { width: 90, height: 120 }
                                        });

                                        row.height = 120;
                                    }
                                } catch (imgError) {
                                    console.error('Error loading image:', imgError);
                                }
                            };

                            reader.readAsDataURL(imageBlob);
                        } catch (error) {
                            console.error('Error fetching image:', error);
                        }
                    }
                }

                // ปรับความสูงของหัวข้อ
                worksheet.getRow(1).height = 25;

                // รอให้โหลดรูปภาพเสร็จ
                await new Promise(resolve => setTimeout(resolve, 1000));

                // บันทึก file
                await workbook.xlsx.writeBuffer().then(buffer => {
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `scan-records-${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                });

                showNotification('สำเร็จ', 'ส่งออก Excel เรียบร้อยแล้ว');
            } catch (error) {
                console.error('Export error:', error);
                alert('เกิดข้อผิดพลาดในการส่งออก: ' + error.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

*/

//แก้ไขเมื่อ export records-export-btn ให้แสดงผลให้ตรงกันกับที่แสดงใน table renderScanRecordsTableByDateRange , renderScanRecordsTableByTimeRange