// eslint-disable-next-line @typescript-eslint/no-var-requires
const momentt = require("moment");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const io = require("socket.io-client");
const socket = io();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ejs = require("ejs");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chartJS = require("chart.js");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const googlemaps = require('@googlemaps/js-api-loader');

/**
 * Toggles the action spinner element that is defined by the load and loading classes
 * @param element the element that contains children with these classes
 */
function toggleActionSpinner(element: Element): void {
    const load = element.querySelector(".load");
    const loading = element.querySelector(".loading");

    if (load !== null && loading !== null) {
        load.classList.toggle("d-none");
        loading.classList.toggle("d-none");
    }
}

/**
 * General function that shows the update spinner
 * @param page the page for which the spinner must be stopped
 */
function showUpdateSpinner(page: string): void {
    const updateSpinner = document.querySelector(".update-spinner[data-page='" + page + "']");
    if (updateSpinner) updateSpinner.classList.remove("d-none");
}

/**
 * General function that hides the update spinner
 * @param page the page for which the spinner must be stopped
 */
function hideUpdateSpinner(page: string): void {
    const updateSpinner = document.querySelector(".update-spinner[data-page='" + page + "']");
    if (updateSpinner) setTimeout(function () {
        updateSpinner.classList.add("d-none");
    }, 500);
}

/**
 * General function that animates a button that has the animate class attached to it, in combination with the 
 * style="--animate-color: var(--bs-danger)" attribute
 */
function clickAnimationListeners(): void {
    const animateElements = document.querySelectorAll(".animate");
    $.each(animateElements, function (_, element) {
        element.addEventListener("click", function () {
            element.classList.add("clicked");

            setTimeout(function () {
                element.classList.remove("clicked");
            }, 1000);
        });
    });
}

//// CALENDAR-START ////
/**
 * Event listeners for toggling more or less calendar events on the homepage widget
 */
function onCalendarToggleEventsHomeListeners(): void {
    const previewEvents = document.querySelectorAll(".preview-event");
    const togglePreviewEvents = document.querySelectorAll(".toggle-preview-events");

    $.each(togglePreviewEvents, function (_, element) {
        const show = element.getAttribute("data-show");
        element.addEventListener("click", function () {
            $.each(togglePreviewEvents, function (_, el) {
                if (el === element) {
                    el.classList.add("d-none");
                } else {
                    el.classList.remove("d-none");
                }
            });

            if (previewEvents.length > 3) {
                $.each(previewEvents, function (index, el) {
                    if (show === "true") {
                        el.classList.remove("d-none");
                        return;
                    }

                    if (index >= 3) el.classList.add("d-none");
                });
            }
        });
    });
}

/**
 * Fetch calendar events and update the DOM on the homepage widget
 */
function calendarUpdateEventsHome(): void {
    showUpdateSpinner("calendar");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.querySelector("#calendarEventsWrapper");

    fetch("/api/calendar/preview/events").then(function (req) {
        if (req.status === 200) {
            req.clone().json().then(function (obj) {
                fetch("/views/widgets/calendar/calendar_events_home.ejs").then(function (resp) {
                    return resp.clone().text();

                }).then(function (template) {

                    target.innerHTML = ejs.render(template, {page: page, events: obj});

                    onCalendarToggleEventsHomeListeners();
                });
            });
        }

        hideUpdateSpinner("calendar");
    });
}

/**
 * Fetch calendar events and update the DOM on the calendar page. 
 * Obtains the currently set year and week from the DOM to use in the request.
 */
function calendarUpdateEvents(): void {
    showUpdateSpinner("calendar");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.getElementById("calendarEventsWrapper");
    const year = target.getAttribute("data-year");
    const week = target.getAttribute("data-week");

    fetch("/api/calendar/events/" + year + "/" + week).then(function (req) {
        if (req.status === 200) {
            req.clone().json().then(function (obj) {
                fetch("/views/widgets/calendar/calendar_events.ejs").then(function (resp) {
                    return resp.clone().text();

                }).then(function (template) {

                    target.innerHTML = ejs.render(template, {page: page, events: obj});
                    document.getElementById("calendarEventsWeekNumber").innerHTML = week;

                    const date = new Date();
                    const calendarRefreshedAt = document.getElementById("calendarRefreshedAt");
                    calendarRefreshedAt.setAttribute("data-date", date.getTime().toString());

                });
            });
        }

        hideUpdateSpinner("calendar");
    });
}

/**
 * Action for deleting a calendar
 */
function doCalendarDeleteAction(): void {
    const form = document.getElementById("newUpdateCalendarForm") as HTMLFormElement;
    const calendarID = (form.querySelector("[name='id']") as HTMLInputElement).value;

    if (calendarID === undefined) return;

    fetch("/api/calendar/delete/" + calendarID, {
        method: "DELETE"
    }).then(function (req) {
        if (req.status !== 200) {
            console.log(req.statusText);
            return;
        }

        const calendarRow = document.querySelector(".calendar-row[data-id='"+ calendarID +"']");
        calendarRow.remove();

        new Promise(function (resolve) {
            setTimeout(resolve, 1000);
        }).then(function () {
            calendarUpdateEvents();
        });
    });

}

/**
 * Action for adding or updating a calendar
 * @param event form submission event
 * @param element form contents upon submission
 */
function doCalendarAddEditCalendarAction(event: Event, element: HTMLFormElement): void {
    event.preventDefault();

    const customName = (element.querySelector("[name='customName']") as HTMLInputElement).value;
    const url = (element.querySelector("[name='url']") as HTMLInputElement).value;
    const color = (element.querySelector("[name='color']") as HTMLInputElement).value;

    const id = (element.querySelector("[name='id']") as HTMLInputElement).value;
    const add = id === "";
    const endpoint = "/api/calendar/" + (add ? "add" : "update/" + id);

    fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            customName: customName,
            url: url,
            color: color
        })
    }).then(function (req) {
        if (req.status !== 200) {
            console.log(req.statusText);
            return;
        }

        if (add) {
            document.location.reload();
        }

        const calendarRow = document.querySelector(".calendar-row[data-id='" + id + "']");
        const calendarToggle = calendarRow.querySelector(".calendar-toggle");
        $.each(calendarToggle.classList, function (_, className) {
            if (className !== undefined && className.length > 2 && className.substring(0, 3) === "bg-") {
                calendarToggle.classList.remove(className);
            }
        });
        calendarToggle.classList.add(color);
        calendarRow.querySelector(".calendar-name").innerHTML = customName;

        (document.getElementById("newUpdateCalendarForm") as HTMLFormElement).reset();
        document.getElementById("calendarNewUpdateWrapper").classList.add("d-none");
        document.getElementById("calendarList").classList.remove("d-none");

        new Promise(function (resolve) {
            setTimeout(resolve, 1000);
        }).then(function () {
            calendarUpdateEvents();
        });
    });
}

/**
 * Open and fill the edit form for a calendar
 * @param element the button that is clicked 
 */
function calendarShowUpdateCalendarWindow(element: Element): void {
    showUpdateSpinner("calendar");

    const calendarID = element.getAttribute("data-id");

    fetch("/api/calendar/find/" + calendarID).then(function (req) {
        if (req.status === 200) {
            req.clone().json().then(function (obj) {

                const form = document.getElementById("newUpdateCalendarForm");
                (form.querySelector("[name='id']") as HTMLInputElement).value = obj.id;
                (form.querySelector("[name='customName']") as HTMLInputElement).value = obj.customName;
                (form.querySelector("[name='url']") as HTMLInputElement).value = obj.url;
                (form.querySelector("[name='color']") as HTMLInputElement).value = obj.color;
                $.each(form.querySelectorAll(".calendar-color-toggle"), function (_, element: HTMLInputElement) {
                    element.checked = element.getAttribute("data-color") === obj.color;
                });

                document.getElementById("calendarNewUpdateWrapper").classList.remove("d-none");
                document.getElementById("calendarList").classList.add("d-none");
            });
        }

        hideUpdateSpinner("calendar");
    });
}

/**
 * Set the year and week values as attributes when the next or previous week button is clicked
 * @param element the button that is clicked
 * @param next boolean that denotes to propagate to the next or previous week
 */
function calendarSetNextPreviousEvents(element: Element, next: boolean): void {
    const target = document.getElementById("calendarEventsWrapper");
    const year = Number(target.getAttribute("data-year"));
    const week = Number(target.getAttribute("data-week"));

    if (next === true) {
        target.setAttribute("data-year", (((week + 1) % 53 === 1) ? year + 1 : year).toString());
        target.setAttribute("data-week", ((week + 1) % 53).toString());
    } else {
        const newWeek = (week - 1 === 0) ? 52 : week - 1;
        target.setAttribute("data-year", (newWeek === 52 ? year - 1 : year).toString());
        target.setAttribute("data-week", newWeek.toString());
    }

    calendarUpdateEvents();
}

/**
 * Enable or disable the visibility of a calendar and its events
 * @param element the checkbox input element
 * @param id the id of the calendar
 * @param status the status of the checkbox 
 */
function doCalendarToggleCalendarAction(element: Element, id: string, status: boolean): void {
    fetch("/api/calendar/toggle/" + id + "/" + status, {
        method: "POST"
    }).then(function (req) {
        if (req.status === 200) {
            new Promise(function (resolve) {
                setTimeout(resolve, 1000);
            }).then(function () {
                calendarUpdateEvents();
            });
        }
    });
}

/**
 * Fetch calendar month data for next or previous month
 * @param element the button that is clicked
 * @param next boolean that denotes next or previous month
 */
function calendarUpdateMonth(element: Element, next: boolean): void {
    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.getElementById("calendarWrapper");
    const container = document.getElementById("calendarMonthContainer");
    const currentYear = Number(container.getAttribute("data-year"));
    const currentMonth = Number(container.getAttribute("data-month"));
    const date = new Date(currentYear, currentMonth);
    date.setMonth(next ? date.getMonth() + 1 : date.getMonth() - 1);

    fetch('/api/calendar/month/' + date.getFullYear() + "/" + date.getMonth()).then(function(req) {
        if (req.status === 200) {
            req.clone().json().then(function(obj) {

                fetch("/views/widgets/calendar/calendar_month.ejs").then(function (resp) {
                    return resp.clone().text();

                }).then(function (template) {

                    target.innerHTML = ejs.render(template, {page: page, calendar: obj});

                    const changeMonthElements = document.querySelectorAll(".change-month");
                    $.each(changeMonthElements, function (_, element) {
                        element.addEventListener("click", function () {
                            calendarUpdateMonth(element, element.getAttribute("data-next") === "true");
                        });
                    });

                    const showEventsWeekNumber = document.querySelectorAll(".show-events-week-number");
                    $.each(showEventsWeekNumber, function (_, element) {
                        element.addEventListener("click", function () {
                            const targetEvents = document.getElementById("calendarEventsWrapper");
                            const targetMonth = document.getElementById("calendarMonthContainer");
                            const year = targetMonth.getAttribute("data-year");
                            const week = element.getAttribute("data-week");

                            targetEvents.setAttribute("data-year", year.toString());
                            targetEvents.setAttribute("data-week", week.toString());

                            calendarUpdateEvents();
                        });
                    });

                });
            });
        }
    });
}
///// CALENDAR-END ////

///// DEVICES-START ////
/**
 * Action to execute a scene for devices
 * @param event the event of clicking the scene action button
 * @param sceneID the id of the corresponding scene
 */
function doDevicesExecuteSceneAction(event: Event, sceneID: string): void {
    event.preventDefault();

    showUpdateSpinner("devices");

    fetch("/api/devices/scene/" + sceneID).then(function () {
        hideUpdateSpinner("devices");
    });
}

/**
 * Action to toggle the state of a device
 * @param event the event of clicking the toggle device action button
 * @param deviceID the id of the corresponding device
 * @param state the new state of the device
 */
function doDevicesToggleAction(event: Event, deviceID: string, state: string): void {
    event.preventDefault();

    showUpdateSpinner("devices");

    fetch("/api/devices/" + deviceID + "/" + state).then(function () {
        hideUpdateSpinner("devices");
    });
}

/**
 * Action to dim a device
 * @param event the event of clicking the dim device action button
 * @param deviceID the id of the corresponding device
 * @param level the new dimming level of the device 
 */
function doDevicesDimAction(event: Event, deviceID: string, level: string | number | string[]): void {
    event.preventDefault();

    showUpdateSpinner("devices");

    fetch("/api/devices/" + deviceID + "/dim/" + level).then(function (req) {
        if (req.status === 200) {
            document.querySelector("#toggleButtons-" + deviceID).classList.remove("d-none");
            document.querySelector("#brightness-" + deviceID).classList.add("d-none");
            document.querySelector("#name-" + deviceID).classList.remove("d-none");
        }

        hideUpdateSpinner("devices");
    });
}

/**
 * Action to color a device
 * @param event the event of clicking the color device action button
 * @param deviceID the id of the corresponding device
 * @param level the new coloring level of the device
 */
function doDevicesColorAction(event: Event, deviceID: string, level: string | number | string[]): void {
    event.preventDefault();

    showUpdateSpinner("devices");

    fetch("/api/devices/" + deviceID + "/color/" + level).then(function (req) {
        if (req.status === 200) {
            document.querySelector("#toggleButtons-" + deviceID).classList.remove("d-none");
            document.querySelector("#color-" + deviceID).classList.add("d-none");
            document.querySelector("#name-" + deviceID).classList.remove("d-none");
        }

        hideUpdateSpinner("devices");
    });
}

/**
 * Event listeners for the scene actions
 */
function onDevicesSceneListeners(): void {
    const sceneElements = document.querySelectorAll(".execute-scene");
    $.each(sceneElements, function (index, element) {
        const sceneID = $(this).attr("scene-id");

        element.addEventListener("click", function (event) {
            event.stopPropagation();
            doDevicesExecuteSceneAction(event, sceneID);
        });
    });
}

/**
 * Event listeners for the device toggle actions
 */
function onDevicesSwitchListeners(): void {
    const switchElements = document.querySelectorAll(".switch-device");
    $.each(switchElements, function (index, element) {
        const deviceID = $(this).attr("device-id");
        const state = $(this).attr("state");

        element.addEventListener("click", function (event) {
            event.stopPropagation();

            doDevicesToggleAction(event, deviceID, state);
        });
    });
}

/**
 * Event listeners for the device dimming actions
 */
function onDevicesDimListeners(): void {
    const dimElements = document.querySelectorAll(".dim-device");
    $.each(dimElements, function (index, element) {
        const deviceID = $(this).attr("device-id");

        element.addEventListener("change", function (event) {
            event.stopPropagation();

            const level = $(this).val();
            doDevicesDimAction(event, deviceID, level);
        });

        element.addEventListener("click", function (event) {
            event.stopPropagation();

            const level = $(this).val();
            doDevicesDimAction(event, deviceID, level);
        });
    });
}

/**
 * Event listeners for showing/hiding the device dimming or coloring sliders in the DOM
 */
function onDevicesToggleBrightnessColorListeners(): void {
    const dimColorToggleElements = document.querySelectorAll(".toggle-brightness-color");
    $.each(dimColorToggleElements, function (index, element) {
        const deviceID = $(this).attr("device-id");
        const type = $(this).attr("toggle-type");

        element.addEventListener("click", function (event) {
            event.stopPropagation();

            const nameElement = document.querySelector("#name-" + deviceID);
            const brightnessElement = document.querySelector("#brightness-" + deviceID);
            const colorElement = document.querySelector("#color-" + deviceID);
            const toggleButtonElements = document.querySelector("#toggleButtons-" + deviceID);

            if (type === "brightness") {
                nameElement.classList.add("d-none");
                brightnessElement.classList.remove("d-none");
                toggleButtonElements.classList.add("d-none");

                if (colorElement !== null) {
                    colorElement.classList.add("d-none");
                }
            }

            if (type === "color") {
                nameElement.classList.add("d-none");
                brightnessElement.classList.add("d-none");
                colorElement.classList.remove("d-none");
                toggleButtonElements.classList.add("d-none");
            }
        });
    });
}

/**
 * Event listeners for the device coloring actions
 */
function onDevicesColorListeners(): void {
    const colorElements = document.getElementsByClassName("color-device");
    $.each(colorElements, function (index, element) {
        const deviceID = $(this).attr("device-id");

        element.addEventListener("change", function (event) {
            event.stopPropagation();

            doDevicesColorAction(event, deviceID, $(this).val());
        });

        element.addEventListener("click", function (event) {
            event.stopPropagation();

            doDevicesColorAction(event, deviceID, $(this).val());
        });
    });
}

/**
 * Toggles the blacklist buttons on every device on the devices page
 * @param toggle the toggle state
 */
function devicesToggleBlacklistedDevices(toggle: string): void {
    const deviceVisibilityButtons = document.querySelectorAll(".device-visibility");
    $.each(deviceVisibilityButtons, function (_, el) {
        if (toggle === "hide") {
            el.classList.add("d-none");
        } else {
            el.classList.remove("d-none");
        }
    });

    const deviceToggleButtons = document.querySelectorAll(".device-toggles");
    $.each(deviceToggleButtons, function (_, el) {
        if (toggle === "hide") {
            el.classList.remove("d-none");
        } else {
            el.classList.add("d-none");
        }
    });
}

/**
 * Event listeners to toggle the blacklist state of every device on the devices page
 */
function onDevicesToggleVisibilityListeners(): void {
    const toggleVisibilityButtons = document.querySelectorAll(".toggle-visibility");

    $.each(toggleVisibilityButtons, function (_, element) {
        element.addEventListener("click", function () {
            element.classList.add("d-none");
            document.querySelector(element.getAttribute("data-toggle-inverse")).classList.remove("d-none");

            devicesToggleBlacklistedDevices(element.getAttribute("data-toggle"));

            const hiddenDevices = document.querySelectorAll(".device-hidden");
            $.each(hiddenDevices, function (_, el) {
                el.classList.toggle("d-none");
            });
        });
    });
}

/**
 * Event listeners to toggle the blacklist state of a device on the devices page 
 */
function onDevicesToggleDeviceVisibilityListeners(): void {
    const toggleDeviceVisibilityButtons = document.querySelectorAll(".toggle-devices-visibility");

    $.each(toggleDeviceVisibilityButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();

            element.classList.add("d-none");
            document.querySelector(element.getAttribute("data-toggle-inverse")).classList.remove("d-none");

            const deviceWrapper = element.closest(".device-row");

            const toggleType = element.getAttribute("data-toggle");
            if (toggleType === "hide") {
                deviceWrapper.classList.add("device-hidden");
            } else {
                deviceWrapper.classList.remove("device-hidden");
            }

            const deviceID = element.getAttribute("data-id");
            const blacklistID = deviceWrapper.getAttribute("data-blacklist-id");

            const body = {
                type: "devices",
                description: "Device Blacklisted",
                specification: "blacklist",
                value: deviceID
            };

            fetch("/api/settings" + (toggleType === "show" ? "/" + blacklistID : ""), {
                method: toggleType === "hide" ? "POST" : "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            }).then(function (req) {
                if (req.ok && req.status === 200) {
                    if (toggleType === "hide") {
                        req.clone().json().then(function (obj) {
                            element.setAttribute("data-blacklist-id", obj.id);
                        });
                    } else {
                        element.setAttribute("data-blacklist-id", "");
                    }
                }
            });
        });
    });
}

/**
 * Update the devices using their template files
 * @param data the data consisting of all devices
 */
function devicesUpdate(data: any): void {
    showUpdateSpinner("devices");

    fetch("/api/app/templates/devices").then(function (req) {
        if (req.status === 200) {

            req.clone().json().then(function (templates) {
                const page = document.querySelector("body").getAttribute("data-page");
                const sceneTarget = document.querySelector("#deviceSceneList");
                const switchTarget = document.querySelector("#deviceSwitchList");
                const dimmerTarget = document.querySelector("#deviceDimmerList");
                const colorTarget = document.querySelector("#deviceColorList");
                // const dimmerColorTarget = document.querySelector("#deviceDimmerColorList");
                const switchDimmerColorTarget = document.querySelector("#deviceSwitchDimmerColorList");

                if (sceneTarget) {
                    sceneTarget.innerHTML = ejs.render(templates.scene, {page: page, devices: data});
                }

                if (page === "home") {
                    if (switchDimmerColorTarget) {
                        switchDimmerColorTarget.innerHTML = ejs.render(templates.switch, {
                                page: page,
                                devices: data
                            }) +
                            ejs.render(templates.dimmer, { page: page, devices: data }) +
                            ejs.render(templates.color, { page: page, devices: data });
                    }
                } else {
                    if (switchTarget) {
                        switchTarget.innerHTML = ejs.render(templates.switch, { page: page, devices: data });
                    }
                    if (dimmerTarget) {
                        dimmerTarget.innerHTML = ejs.render(templates.dimmer, {page: page, devices: data});
                    }
                    if (colorTarget) {
                        colorTarget.innerHTML = ejs.render(templates.color, {page: page, devices: data});
                    }
                }

                if (page === "devices") {
                    const showDeviceVisibilityElement = document.getElementById("showDeviceVisibility");
                    if (showDeviceVisibilityElement) {
                        showDeviceVisibilityElement.classList.remove("d-none");
                    }

                    const hideDeviceVisibilityElement = document.getElementById("hideDeviceVisibility");
                    if (hideDeviceVisibilityElement) {
                        hideDeviceVisibilityElement.classList.add("d-none");
                    }

                    const updatedAt = new Date(data.updatedAt);
                    const devicesRefreshedAt = document.querySelector("#devicesRefreshedAt");
                    devicesRefreshedAt.setAttribute("data-date", data.updatedAt.toString());
                    devicesRefreshedAt.innerHTML = ('0'+updatedAt.getHours()).slice(-2) + ":" + ('0'+updatedAt.getMinutes()).slice(-2);
                }

                onDevicesSceneListeners();
                onDevicesSwitchListeners();
                onDevicesDimListeners();
                onDevicesToggleBrightnessColorListeners();
                onDevicesColorListeners();
                onDevicesToggleDeviceVisibilityListeners();
                clickAnimationListeners();

                hideUpdateSpinner("devices");
            });
        }
    });
}

/**
 * Event listeners to toggle between the scenes and switch/dim/color devices on the home page widget
 */
function devicesToggleDeviceTypes(): void {
    const toggleDeviceTypeElements = document.querySelectorAll(".toggle-device-type");
    $.each(toggleDeviceTypeElements, function (_, element) {
        element.addEventListener("click", function () {
            const target = element.getAttribute("data-target");

            $.each(toggleDeviceTypeElements, function (_, el) {
                el.classList.add(el === element ? "btn-blue" : "btn-blue-dark");
                el.classList.remove(el === element ? "btn-blue-dark" : "btn-blue");
            });

            const deviceWrapperElements = document.querySelectorAll(".device-wrapper");
            $.each(deviceWrapperElements, function (_, el) {
                if (el.id !== target) el.classList.add("d-none");
            });

            document.querySelector(target).classList.remove("d-none");
        });
    });
}
//// DEVICES-END ////

//// ENERGY-START ////
/**
 * Create the historical energy charts on the energy page
 */
function energyRenderCharts(): void {
    showUpdateSpinner("energy");

    const data = JSON.parse(document.getElementById("energyData").innerText);

    const labels = data.readings.map(function (reading: { date: number }) {
        return reading.date;
    });

    const energyCharts = document.querySelectorAll(".energy-chart");
    $.each(energyCharts, function (_, ch) {
        const type = ch.getAttribute("data-type");

        const chart = new chartJS.Chart(ch, {
            type: "bar",
            data: {
                labels: labels,
            },
            options: {
                legend: {
                    display: false,
                },
                scales: {
                    xAxes: [
                        {
                            stacked: true,
                            scaleLabel: {
                                display: false,
                                fontColor: "#FFFFFF"
                            },
                            ticks: {
                                fontColor: "#FFFFFF",
                                fontSize: 10,
                                autoSkip: false,
                                maxRotation: 0,
                                minRotation: 0,
                                callback: function(value: number): number {
                                    return new Date(value).getDate();
                                }
                            }
                        }
                    ],
                    yAxes: [{
                        stacked: true,
                        scaleLabel: {
                            display: false,
                            fontColor: "#FFFFFF"
                        },
                        ticks: {
                            beginAtZero: true,
                            fontColor: "#FFFFFF",
                            fontSize: 10,
                            autoSkip: true
                        }
                    }]
                },
                tooltips: {
                    callbacks: {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                        // @ts-ignore
                        title: function(tooltipItems): string {
                            const date = new Date(tooltipItems[0].xLabel);
                            return momentt(date).format("MMM D, YYYY");
                        },
                        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                        // @ts-ignore
                        label: function (tooltipItem, data): string {
                            const typeLabel = (["power-usage", "solar"].includes(type)) ? " kWh" : " m3";
                            return data.datasets[tooltipItem.datasetIndex].label + ": " + data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] + typeLabel;
                        }
                    }
                },
                responsive: true,
            }
        });

        if (type === "power-usage") {
            const wrapper = document.querySelector('.chart-wrapper[data-type="power-usage"]');

            if (!data.hasReadings.powerLowDiff && !data.hasReadings.powerHighDiff) {
                wrapper.classList.add("d-none");
            } else {
                wrapper.classList.remove("d-none");
            }

            chart.data.datasets = [
                {
                    label: "Low Tariff",
                    data: data.readings.map(function (reading: { readings: { powerLowDiff: number}}) {
                        return reading.readings.powerLowDiff;
                    }),
                    backgroundColor: "rgb(243, 156, 18)",
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: "High Tariff",
                    data: data.readings.map(function (reading: { readings: { powerHighDiff: number}}) {
                        return reading.readings.powerHighDiff;
                    }),
                    backgroundColor: "rgb(23, 162, 184)",
                    fill: true,
                    pointRadius: 0
                }
            ];
        } else if (type === "solar") {
            const wrapper = document.querySelector('.chart-wrapper[data-type="solar"]');

            if (!data.hasReadings.solarLowDiff && !data.hasReadings.solarHighDiff) {
                wrapper.classList.add("d-none");
            } else {
                wrapper.classList.remove("d-none");
            }

            chart.data.datasets = [
                {
                    label: "Low Tariff",
                    data: data.readings.map(function (reading: { readings: { solarLowDiff: number}}) {
                        return reading.readings.solarLowDiff;
                    }),
                    backgroundColor: "rgb(158, 158, 158)",
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: "High Tariff",
                    data: data.readings.map(function (reading: { readings: { solarHighDiff: number}}) {
                        return reading.readings.solarHighDiff;
                    }),
                    backgroundColor: "rgb(0, 188, 140)",
                    fill: true,
                    pointRadius: 0
                }
            ];
        } else if (type === "gas") {
            const wrapper = document.querySelector('.chart-wrapper[data-type="gas"]');

            if (!data.hasReadings.gasDiff) {
                wrapper.classList.add("d-none");
            } else {
                wrapper.classList.remove("d-none");
            }

            chart.data.datasets = [
                {
                    label: "Gas",
                    data: data.readings.map(function (reading: { readings: { gasDiff: number}}) {
                        return reading.readings.gasDiff;
                    }),
                    backgroundColor: "rgb(231, 76, 60)",
                    fill: true,
                    pointRadius: 0
                }
            ];
        } else if (type === "water") {
            const wrapper = document.querySelector('.chart-wrapper[data-type="water"]');

            if (!data.hasReadings.waterDiff) {
                wrapper.classList.add("d-none");
            } else {
                wrapper.classList.remove("d-none");
            }

            chart.data.datasets = [
                {
                    label: "Water",
                    data: data.readings.map(function (reading: { readings: { waterDiff: number}}) {
                        return reading.readings.waterDiff;
                    }),
                    backgroundColor: "rgb(55, 90, 127)",
                    fill: true,
                    pointRadius: 0
                }
            ];
        }
        chart.update();

        hideUpdateSpinner("energy");
    });
}

/**
 * Update the live energy readings on the energy page 
 * @param element the clicked button
 * @param next the next or previous month state
 */
function energyUpdateHistoricalReadings(element: Element, next: boolean): void {
    showUpdateSpinner("energy");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.getElementById("energyWrapper");
    const container = document.getElementById("energyData");
    const currentYear = Number(container.getAttribute("data-year"));
    const currentMonth = Number(container.getAttribute("data-month"));
    const date = new Date(currentYear, currentMonth);
    date.setMonth(next ? date.getMonth() + 1 : date.getMonth() - 1);
    const newYear = date.getFullYear();
    const newMonth = date.getMonth();

    fetch('/api/devices/energy/historical/' + newYear + '/' + newMonth).then(function (req) {
        if (req.status === 200) {
            req.clone().json().then(function(obj) {
                fetch("/views/widgets/energy/energy_historical.ejs").then(function (resp) {
                    return resp.clone().text();

                }).then(function (template) {
                    target.innerHTML = ejs.render(template, {page: page, history: obj});

                    energyRenderCharts();

                    const changeMonthElements = document.querySelectorAll(".change-month");
                    $.each(changeMonthElements, function (_, element) {
                        element.addEventListener("click", function () {
                            energyUpdateHistoricalReadings(element, element.getAttribute("data-next") === "true");
                        });
                    });
                });
            });
        }

        hideUpdateSpinner("energy");
    });
}

/**
 * Fetch and update the live energy readings on the energy page
 * @param data the data consisting of the energy readings
 */
function energyUpdateLiveReadings(data: any): void {
    showUpdateSpinner("energy");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.querySelector("#liveEnergyReadings");

    if (!target) {
        hideUpdateSpinner("energy");
        return;
    }

    fetch("/views/widgets/energy/energy_meter_readings.ejs").then(function (resp) {
        return resp.clone().text();

    }).then(function (template) {

        target.innerHTML = ejs.render(template, {page: page, current: data});

        hideUpdateSpinner("energy");

    });
}
//// ENERGY-END ////

//// SETTINGS-START ////
/**
 * Boilerplate API fetch request for settings
 * @param urlAddon to be added after the default url
 * @param method the fetch request method
 * @param body the body of the request
 */
function settingsFetchRequestBuilder(urlAddon: string, method: string, body: object): void {
    fetch("/api/settings" + urlAddon, {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    }).then(function (req) {
        if (req.status !== 200) {
            return;
        }

        document.location.reload();
    });
}

/**
 * Post setting request to the API
 * @param event the event form submission
 * @param element the submitted form contents
 */
function doSettingsAddAction(event: Event, element: HTMLFormElement): void {
    event.preventDefault();

    const description = (element.elements.namedItem("description") as HTMLInputElement).value;
    const type = (element.elements.namedItem("type") as HTMLInputElement).value;
    const specification = (element.elements.namedItem("specification") as HTMLInputElement).value;
    const value = (element.elements.namedItem("value") as HTMLInputElement).value;

    settingsFetchRequestBuilder("", "POST", { description, type, specification, value });
}

/**
 * Put/Update setting request to the API
 * @param event the event form submission
 * @param element the submitted form contents
 */
function doSettingsUpdateAction(event: Event, element: HTMLFormElement): void {
    event.preventDefault();

    const id = element.getAttribute("data-id");
    const specification = (element.elements.namedItem("specification") as HTMLInputElement).value;
    const value = (element.elements.namedItem("value") as HTMLInputElement).value;

    settingsFetchRequestBuilder("/" + id, "PUT", { specification, value });
}

/**
 * Delete setting request to the API
 * @param event the clicked button event
 * @param element the clicked button
 */
function doSettingsDeleteAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = element.getAttribute("data-id");

    settingsFetchRequestBuilder(`/${id}`, "DELETE", {});
}
//// SETTINGS-END ////

//// SPOTIFY-START ////
/**
 * Navigate to a spotify collection url
 * @param element the clicked button
 */
function doSpotifyNavigateToCollectionAction(element: Element): void {
    const collectionType = element.getAttribute("collection-type");
    const collectionID = element.getAttribute("collection-id");

    location.href = "/spotify/" + collectionType + "/" + collectionID;
}

/**
 * Action to set playback of spotify collection
 * @param element the clicked button
 */
function doSpotifyPlayCollectionAction(element: Element): void {
    showUpdateSpinner("spotify");
    const uri = element.getAttribute("collection-uri");
    const offset = element.getAttribute("collection-offset");

    fetch("/api/spotify/playback/uri/" + uri + "/" + offset, { method: "PUT" });
}

/**
 * Action to set playback of spotify player
 * @param element the clicked button
 */
function doSpotifyPlaybackAction(element: Element): void {
    showUpdateSpinner("spotify");
    const type = element.getAttribute("action-type");

    fetch("/api/spotify/playback/" + type, { method: "PUT" });
}

/**
 * Event listeners to set playback of spotify player and collection
 */
function onSpotifyPlayerListeners(): void {
    const playbackButtons = document.querySelectorAll(".spotify-playback-button");
    $.each(playbackButtons, function (_, element) {
        element.addEventListener("click", function () {
            doSpotifyPlaybackAction(element);
        });
    });

    const collectionPlayButtons = document.querySelectorAll(".collection-play");
    $.each(collectionPlayButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();

            doSpotifyPlayCollectionAction(element);
        });
    });
}

/**
 * Event listeners for setting the volume of spotify player
 */
function onSpotifyVolumeListeners(): void {
    const volumeButtons = document.querySelectorAll(".spotify-volume-button");
    $.each(volumeButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();

            const increase = element.getAttribute("action-type") === "increase";

            fetch("/api/spotify/volume/" + increase.toString(), {
                method: "PUT"
            });
        });
    });
}

/**
 * Event listeners for navigating to spotify collections
 */
function onSpotifyCollectionListeners(): void {
    const collectionOpenButtons = document.querySelectorAll(".collection-open");
    $.each(collectionOpenButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();

            doSpotifyNavigateToCollectionAction(element);
        });
    });
}

/**
 * Event listeners for searching spotify
 */
function onSpotifySearchListeners(): void {
    const searchCategoryButtons = document.querySelectorAll(".search-category-toggle");
    $.each(searchCategoryButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();

            const enabled = element.getAttribute("enabled") === "true";
            element.setAttribute("enabled", (enabled !== true).toString());

            const enabledColor = element.getAttribute("enabled-color");
            const disabledColor = element.getAttribute("disabled-color");

            element.classList.remove(enabled ? enabledColor : disabledColor);
            element.classList.add(enabled ? disabledColor : enabledColor);
        });
    });

    const spotifySearchForm = document.querySelectorAll("#spotifySearchForm");
    $.each(spotifySearchForm, function (_, element: HTMLFormElement) {
        element.addEventListener("submit", function (event) {
            event.preventDefault();

            const selectedTypes: string[] = [];

            const searchCategoryButtons = document.querySelectorAll(".search-category-toggle");
            $.each(searchCategoryButtons, function (_, element) {
                if (element.getAttribute("enabled") === "true") selectedTypes.push(element.getAttribute("search-category"));
            });

            const formTarget = event.currentTarget as HTMLFormElement;

            (formTarget.elements.namedItem("types") as HTMLInputElement).value = selectedTypes.length > 0 ? selectedTypes.join(",") : "";
            formTarget.submit();
        });
    });
}

/**
 * Event listeners for toggling categories on spotify search, artist, and top list
 */
function onSpotifyCategoryListeners(): void {
    const categoryToggles = document.querySelectorAll(".toggle-category");
    $.each(categoryToggles, function (_, element) {
        element.addEventListener("click", function () {
            const selectedColor = element.getAttribute("selected-color");
            const deselectedColor = element.getAttribute("deselected-color");

            $.each(categoryToggles, function (_, el) {
                el.classList.remove(el === element ? deselectedColor : selectedColor);
                el.classList.add(el === element ? selectedColor : deselectedColor);
            });

            const target = document.querySelector(element.getAttribute("data-target"));
            const nonTarget = document.querySelectorAll(element.getAttribute("data-non-target"));

            $.each(nonTarget, function (_, el) {
                if (el.id === target.id) el.classList.remove("d-none");
                if (el.id !== target.id) el.classList.add("d-none");
            });
        });
    });
}

/**
 * Event listeners for following a spotify track, artist, album, playlist, ...
 */
function onSpotifyFollowListeners(): void {
    const followPlaylistButtons = document.querySelectorAll(".collection-follow");
    $.each(followPlaylistButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();
            showUpdateSpinner("spotify");

            const type = element.getAttribute("collection-type");
            const id = element.getAttribute("collection-id");
            const toFollow = element.getAttribute("collection-following");
            const inverseTarget = document.querySelector(element.getAttribute("inverse-target"));

            fetch("/api/spotify/follow/" + type + "/" + id + "/" + toFollow, { method: "PUT" }).then(function (req) {
                if (req.status === 200) {
                    element.classList.add("d-none");
                    inverseTarget.classList.remove("d-none");
                }

                hideUpdateSpinner("spotify");
            });
        });
    });
}

/**
 * Event listeners for setting device as spotify device and power it on/off 
 */
function onSpotifyDeviceListeners(): void {
    const spotifyDeviceSelect = document.querySelector("select[name='select-device']") as HTMLSelectElement;
    if (spotifyDeviceSelect) {
        spotifyDeviceSelect.addEventListener("change", function () {
            showUpdateSpinner("spotify");
            
            fetch("/api/spotify/device", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    deviceID: spotifyDeviceSelect.value,
                })
            }).then(function () {
                hideUpdateSpinner("spotify");
            });
        });
    }

    const spotifyDeviceSwitches = document.querySelectorAll(".spotify-device-switch");
    $.each(spotifyDeviceSwitches, function (_, element) {
        element.addEventListener("click", function () {
            showUpdateSpinner("spotify");
            
            const state = element.getAttribute("state") === "on";

            fetch("/api/spotify/power/" + state.toString(), { method: "PUT" }).then(function () {
                hideUpdateSpinner("spotify");
            });
        });
    });
}

/**
 * Update the spotify player on the home and spotify page
 * @param data the data consisting of spotify player data
 */
function spotifyUpdatePlayer(data: object): void {
    showUpdateSpinner("spotify");

    const page = document.querySelector("body").getAttribute("data-page");
    const spotifyTarget = document.querySelector("#spotifyPlayerWrapper");
    const spotifyDeviceTarget = document.querySelector("#spotifyDeviceWrapper");

    if (!spotifyTarget) {
        hideUpdateSpinner("spotify");
        return;
    }

    fetch("/views/widgets/spotify/spotify_player.ejs").then(function (resp) {
        return resp.clone().text();
    }).then(function (template) {

        spotifyTarget.innerHTML = ejs.render(template, {page: page, spotify: data});

        onSpotifyPlayerListeners();
        onSpotifyVolumeListeners();
        onSpotifyFollowListeners();
    });

    if (!spotifyDeviceTarget) {
        hideUpdateSpinner("spotify");
        return;
    }

    fetch("/views/widgets/spotify/spotify_device.ejs").then(function (resp) {
       return resp.clone().text();
    }).then(function (template) {

        spotifyDeviceTarget.innerHTML = ejs.render(template, {page: page, spotify: data});

        onSpotifyDeviceListeners();
        hideUpdateSpinner("spotify");
    });
}

/**
 * Updates the spotify device template
 * @param data the data consisting of the spotify device data
 */
function spotifyUpdateDevice(data: object): void {
    showUpdateSpinner("spotify");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.querySelector("#spotifyDeviceWrapper");

    fetch("/views/widgets/spotify/spotify_device.ejs").then(function (resp) {
        return resp.clone().text();
    }).then(function (template) {

        target.innerHTML = ejs.render(template, {page: page, spotify: data});

        onSpotifyDeviceListeners();
        clickAnimationListeners();

        hideUpdateSpinner("spotify");
    });
}
//// SPOTIFY-END ////

//// TASKS-START ////
/**
 * Toggles the visibility of unflagged tasks
 * @param state the visibility state
 */
function tasksToggleUnflagged(state: string): void {
    const toggleState = state === "show";
    const unflaggedTasksWrapper = document.querySelector("#unflaggedTasks");

    if (toggleState) {
        unflaggedTasksWrapper.classList.remove("d-none");
    } else {
        unflaggedTasksWrapper.classList.add("d-none");
    }
}

/**
 * Toggles the visibility of the task delete buttons
 * @param state the visibility state
 */
function tasksToggleDeleteButtons(state: string): void {
    const toggleState = state === "show";
    const taskDeleteElements = document.querySelectorAll(".task-delete");

    $.each(taskDeleteElements, function (_, el) {
        if (toggleState) {
            el.classList.remove("d-none");
        } else {
            el.classList.add("d-none");
        }
    });
}

/**
 * Toggles the visibility of the completed tasks
 * @param state the visibility state
 */
function tasksToggleCompleted(state: string): void {
    const toggleState = state === "show";
    const taskElements = document.querySelectorAll(".task-item");

    $.each(taskElements, function (_, el) {
        if (toggleState) {
            el.classList.remove("d-none");
        } else {
            if (el.getAttribute("data-completed") === "true") {
                el.classList.add("d-none");
            }
        }
    });

    const toggleButtons = document.querySelectorAll(".toggle-task-visibility");
    $.each(toggleButtons, function (_, element) {
        if (element.getAttribute("data-toggle") === state) {
            element.classList.add("d-none");
        } else {
            element.classList.remove("d-none");
        }
    });
}

/**
 * Sets the complete or flag status of a new or existing task
 * @param id the id of the task
 * @param toggle the new flag state of the task
 * @param type the type of the task (new, flag, or complete)
 */
function doTasksCompleteFlagAction(id: string, toggle: boolean, type: string): void {
    if (id === "new" && type === "flag") {
        const flagElement = document.querySelector(".task-flag[data-id='" + id + "']");
        const flagChildElements = flagElement.querySelectorAll(".flag-child");
        $.each(flagChildElements, function (_, element) {
            element.classList.toggle("d-none");
        });

        const newTaskFlaggedInputElement = (document.querySelector("input[name='newTaskFlagged']") as HTMLInputElement);
        newTaskFlaggedInputElement.value = toggle ? "1" : "0";

        return;
    }

    fetch("/api/tasks/" + type + "/" + id + "/" + (toggle ? "true" : "false"), { method: "POST" });
}

/**
 * Delete a task
 * @param id the id of the task
 */
function doTasksDeleteAction(id: string): void {

    fetch("/api/tasks/" + id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
}

/**
 * Event listeners for deleting tasks
 */
function onTasksDeleteListeners(): void {
    const deleteTaskElements = document.querySelectorAll(".task-delete");
    $.each(deleteTaskElements, function (index, element: HTMLInputElement) {
        element.addEventListener("click", function () {
            doTasksDeleteAction(element.getAttribute("data-id"));
        });
    });
}

/**
 * Event listeners for completing tasks
 */
function onTasksCompleteListeners(): void {
    const completeTaskElements = document.querySelectorAll(".task-complete");
    $.each(completeTaskElements, function (index, element: HTMLInputElement) {
        element.addEventListener("click", function () {
            doTasksCompleteFlagAction(element.getAttribute("data-id"), element.checked, "complete");
        });
    });
}

/**
 * Event listeners for flagging tasks
 */
function onTasksFlagListeners(init: boolean): void {
    const flagTaskElements = document.querySelectorAll(".task-flag");
    $.each(flagTaskElements, function (index, element: HTMLElement) {

        if (!init && element.getAttribute("data-id") === "new") return;

        element.addEventListener("click", function () {
            const flagChild = element.querySelector(".flag-child:not(.d-none)");
            if (!flagChild) return;

            const flagStatus = flagChild.getAttribute("data-flagged") === "true";
            doTasksCompleteFlagAction(
                element.getAttribute("data-id"),
                !flagStatus,
                "flag"
            );
        });
    });
}

/**
 * Post updated task description to API
 */
function onTasksDescriptionChangeListeners(): void {
    const taskDescriptions = document.querySelectorAll(".task-description");
    $.each(taskDescriptions, function (_, element: HTMLInputElement) {
        element.addEventListener("input", function (event) {
            event.stopPropagation();

            const id = element.getAttribute("data-id");

            if (element.value !== "") {
                fetch("/api/tasks/" + id, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        description: element.value
                    })
                });
            }
        });
    });
}

/**
 * Update tasks in DOM
 * @param data the data consisting out of tasks data
 */
function tasksUpdate(data: any): void {
    showUpdateSpinner("tasks");

    const page = document.querySelector("body").getAttribute("data-page");

    const targetFlagged = document.querySelector("#flaggedTasks");
    const targetUnflagged = document.querySelector("#unflaggedTasks");

    if (!targetFlagged && !targetUnflagged) {
        hideUpdateSpinner("tasks");
        return;
    }

    fetch("/views/widgets/tasks/tasks_items.ejs").then(function (resp) {
        return resp.clone().text();

    }).then(function (template) {

        targetFlagged.innerHTML = ejs.render(template, {page: page, tasks: data, isFlagged: true});
        targetUnflagged.innerHTML = ejs.render(template, {page: page, tasks: data, isFlagged: false});

        onTasksCompleteListeners();
        onTasksFlagListeners(false);
        onTasksDeleteListeners();
        onTasksDescriptionChangeListeners();

        tasksToggleDeleteButtons(document.querySelector(".toggle-delete.d-none").getAttribute("data-toggle"));

        if (page === "home") {
            tasksToggleUnflagged(document.querySelector(".toggle-unflagged.d-none").getAttribute("data-toggle"));
        }

        tasksToggleCompleted(document.querySelector(".toggle-task-visibility.d-none").getAttribute("data-toggle"));

        hideUpdateSpinner("tasks");

    });
}

/**
 * Post new task to API
 * @param event the event form submission
 */
function doTasksAddAction(event: Event): void {
    event.preventDefault();
    const newTaskDescription = (document.querySelector("input[name='newTaskDescription']") as HTMLInputElement);
    const newTaskFlagged = (document.querySelector("input[name='newTaskFlagged']") as HTMLInputElement);
    const newTaskFlagElement = document.querySelector("#flagTaskNew");
    const newTaskUnflagElement = document.querySelector("#unflagTaskNew");

    if (newTaskDescription.value !== "") {
        fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                task: newTaskDescription.value,
                flagged: newTaskFlagged.value === "1"
            })
        }).then(function (req) {
            if (req.status === 200) {
                newTaskDescription.value = "";
                newTaskFlagged.value = "1";
                newTaskFlagElement.classList.remove("d-none");
                newTaskUnflagElement.classList.add("d-none");
            }
        });
    }
}
//// TASKS-END ////

//// TRAVEL-START ////
/**
 * Update the embedded maps depending on the element's id and direction 
 * @param element the element that is clicked
 */
function travelUpdateEmbeddedMap(element: Element): void {
    const parentID = element.getAttribute("data-parent-id");
    const routeDirection = element.getAttribute("data-direction");
    const allMapElements = document.querySelectorAll(".travel-map");
    $.each(allMapElements, function (_, el) {
        el.classList.add("d-none");
    });

    const mapElement = document.querySelector(".travel-map[data-id='" + parentID + "']") as HTMLElement;
    const mapDirection = mapElement.getAttribute("route-direction");

    if (mapDirection === routeDirection) {
        mapElement.removeAttribute("route-direction");
        mapElement.classList.add("d-none");

        return;
    }

    mapElement.classList.remove("d-none");
    mapElement.setAttribute("route-direction", routeDirection);

    const originLocation = {
        lat: Number(element.getAttribute("data-origin-lat")),
        lng: Number(element.getAttribute("data-origin-lon"))
    };
    const destinationLocation = {
        lat: Number(element.getAttribute("data-destination-lat")),
        lng: Number(element.getAttribute("data-destination-lon"))
    };

    const loader = new googlemaps.Loader({
        apiKey: document.querySelector("#travelNSWrapper").getAttribute("google-api-key")
    });

    loader.load().then(function (google: any) {
        const map = new google.maps.Map(mapElement);

        map.setCenter(new google.maps.LatLng(
            ((Math.max(originLocation.lat, destinationLocation.lat) + Math.min(originLocation.lat, destinationLocation.lat)) / 2.0),
            ((Math.max(originLocation.lng, destinationLocation.lng) + Math.min(originLocation.lng, destinationLocation.lng)) / 2.0)
        ));

        map.fitBounds(new google.maps.LatLngBounds(
            new google.maps.LatLng(Math.min(originLocation.lat, destinationLocation.lat), Math.min(originLocation.lng, destinationLocation.lng)),
            new google.maps.LatLng(Math.max(originLocation.lat, destinationLocation.lat), Math.max(originLocation.lng, destinationLocation.lng))
        ));

        const originMarker = new google.maps.Marker({
            position: originLocation,
            map,
            title: "A"
        });
        originMarker.setMap(map);

        const destinationMarker = new google.maps.Marker({
            position: destinationLocation,
            map,
            title: "B"
        });
        destinationMarker.setMap(map);

        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(map);

        const directionsService = new google.maps.DirectionsService;
        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map
        });

        directionsRenderer.setOptions({
            polylineOptions: {
                strokeColor: 'blue',
                strokeOpacity: 0.3
            }
        });
        directionsRenderer.setMap(map);

        const directionOptions = {
            origin: {
                lat: originLocation.lat,
                lng: originLocation.lng
            },
            destination: {
                lat: destinationLocation.lat,
                lng: destinationLocation.lng
            },
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(),
                trafficModel: 'bestguess'
            },
        };

        directionsService.route(directionOptions)
            .then(function (response: Response) {
                directionsRenderer.setDirections(response);
            })
            .catch(function (err: string) {
                console.log("Directions request failed due to " + err);
            });
    });
}

/**
 * Event listeners for changing between train and maps
 */
function onTravelTypeListeners(): void {
    const travelTypeToggleButtons = document.querySelectorAll(".travel-type-toggle");
    $.each(travelTypeToggleButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            event.stopPropagation();

            const enabledColor = element.getAttribute("enabled-color");
            const disabledColor = element.getAttribute("disabled-color");

            $.each(travelTypeToggleButtons, function (_, el) {
                el.classList.remove(el.id === element.id ? disabledColor : enabledColor);
                el.classList.add(el.id === element.id ? enabledColor : disabledColor);
            });

            const targetElements = document.querySelectorAll(element.getAttribute("data-target"));
            $.each(targetElements, function (_, el) {
                el.classList.remove("d-none");
            });

            const noTargetElements = document.querySelectorAll(element.getAttribute("data-no-target"));
            $.each(noTargetElements, function (_, el) {
                el.classList.add("d-none");
            });
        });
    });
}

/**
 * Event listeners for opening an embedded map
 */
function onTravelOpenMapListeners(): void {
    const openMapElements = document.querySelectorAll(".open-map");
    $.each(openMapElements, function (_, element) {
        element.addEventListener("click", function () {
            travelUpdateEmbeddedMap(element);
        });
    });
}

/**
 * Event listeners for toggling detailed transfer information about a train route 
 */
function onTravelToggleTrainTransfersListeners(): void {
    const toggleTrainTransfersElements = document.querySelectorAll(".toggle-train-transfers");
    $.each(toggleTrainTransfersElements, function (_, element) {
        element.addEventListener("click", function () {
            const id = element.getAttribute("data-id");

            document.querySelector(".train-transfers[data-id='" + id + "']").classList.toggle("d-none");
        });
    });
}

/**
 * Update train data in DOM
 * @param data the data consisting of train data
 */
function travelUpdateTrain(data: any): void {
    showUpdateSpinner("travel");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.getElementById("travelNSWrapper");

    if (!target) {
        hideUpdateSpinner("travel");
        return;
    }

    fetch("/views/widgets/travel/travel_items_ns.ejs").then(function (resp) {
        return resp.clone().text();
    }).then(function (template) {

        target.innerHTML = ejs.render(template, { page: page, train: data });

        onTravelToggleTrainTransfersListeners();

        const dateTrain = new Date(data.updatedAt);
        const travelTrainRefreshedAt = document.getElementById("travelTrainRefreshedAt");
        travelTrainRefreshedAt.innerHTML = ('0'+dateTrain.getHours()).slice(-2) + ":" + ('0'+dateTrain.getMinutes()).slice(-2);

        hideUpdateSpinner("travel");

    });
}

/**
 * Update maps data in DOM
 * @param data the data consisting of maps data
 */
function travelUpdateMaps(data: any): void {
    showUpdateSpinner("travel");

    const page = document.querySelector("body").getAttribute("data-page");
    const target = document.getElementById("travelMapWrapper");

    if (!target) {
        hideUpdateSpinner("travel");
        return;
    }

    fetch("/views/widgets/travel/travel_items_map.ejs").then(function (resp) {
        return resp.clone().text();
    }).then(function (template) {

        target.innerHTML = ejs.render(template, { page: page, map: data });

        onTravelOpenMapListeners();

        const dateMap = new Date(data.updatedAt);
        const travelMapRefreshedAt = document.getElementById("travelMapRefreshedAt");
        travelMapRefreshedAt.innerHTML = ('0'+dateMap.getHours()).slice(-2) + ":" + ('0'+dateMap.getMinutes()).slice(-2);

        hideUpdateSpinner("travel");

    });
}

/**
 * Add address to travel maps
 * @param event the event for the submitted form
 * @param element the submitted form content
 */
function doTravelAddAddressAction(event: Event, element: Element): void {
    event.preventDefault();

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/addresses/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": (element.querySelector("[name='name']") as HTMLInputElement).value,
            "address": (element.querySelector("[name='address']") as HTMLInputElement).value
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Update address to travel maps
 * @param event the event for the submitted form
 * @param element the submitted form content
 */
function doTravelUpdateAddressAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = (element.querySelector("[name='id']") as HTMLInputElement).value;

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/addresses/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": (element.querySelector("[name='name']") as HTMLInputElement).value,
            "address": (element.querySelector("[name='address']") as HTMLInputElement).value
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Delete address to travel maps
 * @param event the event for the submitted form
 * @param element the clicked element
 */
function doTravelDeleteAddressAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = element.getAttribute("data-id");
    const errorMessageElement = document.querySelector(element.getAttribute("error-target"));
    errorMessageElement.innerHTML = "";

    toggleActionSpinner(element);

    fetch("/api/travel/addresses/" + id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) errorMessageElement.innerHTML = data.message;
            });

            toggleActionSpinner(element);

            return;
        }

        document.querySelector(element.getAttribute("data-target")).remove();
    });
}

/**
 * Event listeners for travel maps addresses
 */
function onTravelAddressListeners(): void {
    const addAddressForm = document.getElementById("addAddressForm");
    if (addAddressForm) {
        addAddressForm.addEventListener("submit", function (event) {
            doTravelAddAddressAction(event, this);
        });
    }

    const updateAddressForms = document.querySelectorAll(".updateAddressForm");
    $.each(updateAddressForms, function (_, element) {
        element.addEventListener("submit", function (event) {
            doTravelUpdateAddressAction(event, element);
        });
    });

    const deleteAddressButtons = document.querySelectorAll(".delete-address");
    $.each(deleteAddressButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            doTravelDeleteAddressAction(event, element);
        });
    });
}

/**
 * Add a travel maps route
 * @param event the event for the submitted form
 * @param element the submitted form content
 */
function doTravelAddMapRouteAction(event: Event, element: Element): void {
    event.preventDefault();

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/maproutes/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": (element.querySelector("[name='name']") as HTMLInputElement).value,
            "origin": (element.querySelector("[name='origin']") as HTMLInputElement).value,
            "destination": (element.querySelector("[name='destination']") as HTMLInputElement).value
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Update a travel maps route
 * @param event the event for the submitted form
 * @param element the submitted form content
 */
function doTravelUpdateMapRouteAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = (element.querySelector("[name='id']") as HTMLInputElement).value;

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/maproutes/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": (element.querySelector("[name='name']") as HTMLInputElement).value,
            "origin": (element.querySelector("[name='origin']") as HTMLInputElement).value,
            "destination": (element.querySelector("[name='destination']") as HTMLInputElement).value
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Delete a travel maps route
 * @param event the event for the submitted form
 * @param element the clicked element
 */
function doTravelDeleteMapRouteAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = element.getAttribute("data-id");

    toggleActionSpinner(element);

    fetch("/api/travel/maproutes/" + id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
    }).then(function (req) {
        if (req.status !== 200) {
            toggleActionSpinner(element);

            return;
        }

        document.querySelector(element.getAttribute("data-target")).remove();
    });
}

/**
 * Event listeners for travel maps routes
 */
function onTravelMapRouteListeners(): void {
    const addMapRouteForm = document.getElementById("addMapRouteForm");
    if (addMapRouteForm) {
        addMapRouteForm.addEventListener("submit", function (event) {
            doTravelAddMapRouteAction(event, this);
        });
    }

    const updateMapRouteForms = document.querySelectorAll(".updateMapRouteForm");
    $.each(updateMapRouteForms, function (_, element) {
        element.addEventListener("submit", function (event) {
            doTravelUpdateMapRouteAction(event, element);
        });
    });

    const deleteMapRouteButtons = document.querySelectorAll(".delete-maproute");
    $.each(deleteMapRouteButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            doTravelDeleteMapRouteAction(event, element);
        });
    });
}

/**
 * Add a trainstation to travel train
 * @param event the form submitted event
 * @param element the submitted form content
 */
function doTravelAddTrainStationAction(event: Event, element: Element): void {
    event.preventDefault();

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/trainstations/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "stationCode": (element.querySelector("[name='station']") as HTMLSelectElement).value,
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Delete a trainstation to travel train
 * @param event the click event 
 * @param element the clicked element
 */
function doTravelDeleteTrainStationAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = element.getAttribute("data-id");
    const errorMessageElement = document.querySelector(element.getAttribute("error-target"));
    errorMessageElement.innerHTML = "";

    toggleActionSpinner(element);

    fetch("/api/travel/trainstations/" + id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) errorMessageElement.innerHTML = data.message;
            });

            toggleActionSpinner(element);

            return;
        }

        document.querySelector(element.getAttribute("data-target")).remove();
    });
}

/**
 * Event listeners for travel train stations 
 */
function onTravelTrainStationListeners(): void {
    const addTrainStationForm = document.getElementById("addTrainStationForm");
    if (addTrainStationForm) {
        addTrainStationForm.addEventListener("submit", function (event) {
            doTravelAddTrainStationAction(event, this);
        });
    }

    const deleteTrainStationButtons = document.querySelectorAll(".delete-trainstation");
    $.each(deleteTrainStationButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            doTravelDeleteTrainStationAction(event, element);
        });
    });
}

/**
 * Add a train route to travel train
 * @param event the form submitted event
 * @param element the submitted form content
 */
function doTravelAddTrainRouteAction(event: Event, element: Element): void {
    event.preventDefault();

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/trainroutes/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": (element.querySelector("[name='name']") as HTMLInputElement).value,
            "origin": (element.querySelector("[name='origin']") as HTMLInputElement).value,
            "destination": (element.querySelector("[name='destination']") as HTMLInputElement).value
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Update a train route to travel train
 * @param event the form submitted event
 * @param element the submitted form content
 */
function doTravelUpdateTrainRouteAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = (element.querySelector("[name='id']") as HTMLInputElement).value;

    element.querySelector(".error-message").innerHTML = "";
    toggleActionSpinner(element.querySelector("[type='submit']"));

    fetch("/api/travel/trainroutes/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": (element.querySelector("[name='name']") as HTMLInputElement).value,
            "origin": (element.querySelector("[name='origin']") as HTMLInputElement).value,
            "destination": (element.querySelector("[name='destination']") as HTMLInputElement).value
        })
    }).then(function (req) {
        if (req.status !== 200) {
            req.json().then(function (data) {
                if (data && data.message) element.querySelector(".error-message").innerHTML = data.message;
            });

            toggleActionSpinner(element.querySelector("[type='submit']"));

            return;
        }

        document.location.reload();
    });
}

/**
 * Delete a train route to travel train
 * @param event the click event
 * @param element the clicked element
 */
function doTravelDeleteTrainRouteAction(event: Event, element: Element): void {
    event.preventDefault();

    const id = element.getAttribute("data-id");

    toggleActionSpinner(element);

    fetch("/api/travel/trainroutes/" + id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
    }).then(function (req) {
        if (req.status !== 200) {
            toggleActionSpinner(element);

            return;
        }

        document.querySelector(element.getAttribute("data-target")).remove();
    });
}

/**
 * Event listeners for travel train routes
 */
function onTravelTrainRouteListeners(): void {
    const updateTrainRouteForms = document.querySelectorAll(".updateTrainRouteForm");
    $.each(updateTrainRouteForms, function (_, element) {
        element.addEventListener("submit", function (event) {
            doTravelUpdateTrainRouteAction(event, element);
        });
    });

    const deleteTrainRouteButtons = document.querySelectorAll(".delete-trainroute");
    $.each(deleteTrainRouteButtons, function (_, element) {
        element.addEventListener("click", function (event) {
            doTravelDeleteTrainRouteAction(event, element);
        });
    });

    const addTrainRouteForm = document.getElementById("addTrainRouteForm");
    if (addTrainRouteForm) {
        addTrainRouteForm.addEventListener("submit", function (event) {
            doTravelAddTrainRouteAction(event, this);
        });
    }
}
//// TRAVEL-END ////

//// WEATHER-START ////
/**
 * Update the weather in DOM
 * @param data the data consisting of weather data
 */
function weatherUpdate(data: any): void {
    showUpdateSpinner("weather");

    const page = document.querySelector("body").getAttribute("data-page");

    if (page === "home") {
        const weatherTarget = document.querySelector("#weather");

        if (!weatherTarget) {
            hideUpdateSpinner("weather");
            return;
        }

        fetch("/views/widgets/weather/weather_today_home.ejs").then(function (resp) {
            return resp.clone().text();

        }).then(function (template) {
            weatherTarget.innerHTML = ejs.render(template, {page: page, weather: data});

            hideUpdateSpinner("weather");
        });
    }

    if (page === "weather") {
        fetch("/views/widgets/weather/weather_forecast.ejs").then(function (resp) {
            return resp.clone().text();

        }).then(function (template) {
            const forecastTarget = document.querySelector("#weatherForecast");
            forecastTarget.innerHTML = ejs.render(template, {page: page, weather: data});

            const updatedAt = new Date(data.updatedAt);
            const weatherRefreshedAt = document.getElementById("weatherRefreshedAt");
            weatherRefreshedAt.setAttribute("data-date", data.updatedAt);
            weatherRefreshedAt.innerHTML = ('0'+updatedAt.getHours()).slice(-2) + ":" + ('0'+updatedAt.getMinutes()).slice(-2);

            hideUpdateSpinner("weather");
        });
    }
}
//// WEATHER-END ////

//// CRYPTO-START ////
/**
 * Event delegation listeners for crypto 
 * @param event the clicked event
 */
function onCryptoListeners(event: Event): void {
    event.preventDefault();

    const target = event.target as HTMLElement;
    if (target.classList.contains("crypto-asset-toggle")) {
        const id = target.getAttribute("data-id");
        const state = target.getAttribute("data-state") === "on";

        showUpdateSpinner("crypto");

        fetch("/api/crypto/assets/" + id, {
            method: state ? "DELETE" : "POST"
        }).then(function () {
            hideUpdateSpinner("crypto");
        });
    }
}

/**
 * Get the selected filter values for crypto page (coins per page and page number)
 */
function cryptoGetFilterValues(): object {
    const pageSelectElement = document.querySelector("select[name='crypto-select-page']");

    if (!pageSelectElement) return {};

    return {
        page: pageSelectElement ? (pageSelectElement as HTMLSelectElement).value : 1
    };
}

/**
 * Update crypto in DOM
 * @param data the data consisting of crypto data
 */
function cryptoUpdate(data: any): void {
    showUpdateSpinner("crypto");

    const page = document.querySelector("body").getAttribute("data-page");

    if (page === "home") {
        const cryptoTarget = document.querySelector("#cryptoWrapper");

        if (!cryptoTarget) {
            hideUpdateSpinner("crypto");
            return;
        }

        fetch("/views/widgets/crypto/crypto_items_home.ejs").then(function (resp) {
            return resp.clone().text();

        }).then(function (template) {
            cryptoTarget.removeEventListener("click", onCryptoListeners);

            cryptoTarget.innerHTML = ejs.render(template, {page: page, crypto: data});
            cryptoTarget.addEventListener("click", onCryptoListeners);

            const updatedAt = new Date(data.updatedAt);
            const cryptoRefreshedAt = document.getElementById("cryptoRefreshedAt");
            cryptoRefreshedAt.setAttribute("data-date", data.updatedAt);
            cryptoRefreshedAt.innerHTML = ('0'+updatedAt.getHours()).slice(-2) + ":" + ('0'+updatedAt.getMinutes()).slice(-2);

            hideUpdateSpinner("crypto");
        });
    }

    if (page === "crypto") {
        const cryptoTarget = document.querySelector("#cryptoWrapper");

        if (!cryptoTarget) {
            hideUpdateSpinner("crypto");
            return;
        }

        fetch("/views/widgets/crypto/crypto_items.ejs").then(function (resp) {
            return resp.clone().text();

        }).then(function (template) {
            cryptoTarget.removeEventListener("click", onCryptoListeners);

            cryptoTarget.innerHTML = ejs.render(template, {page: page, crypto: data});
            cryptoTarget.addEventListener("click", onCryptoListeners);

            const updatedAt = new Date(data.updatedAt);
            const cryptoRefreshedAt = document.getElementById("cryptoRefreshedAt");
            cryptoRefreshedAt.setAttribute("data-date", data.updatedAt);
            cryptoRefreshedAt.innerHTML = ('0'+updatedAt.getHours()).slice(-2) + ":" + ('0'+updatedAt.getMinutes()).slice(-2);

            hideUpdateSpinner("crypto");
        });
    }
}
//// CRYPTO-END ////

/**
 * Initialize websockets listeners and transmitters for each service and page
 * @param page the current page
 */
function initializeSockets(page: string): void {
    if (page === "home" || page === "devices") {
        socket.emit("init", { service: "DevicesService", type: "devices"});

        socket.on("devices update", function (data: object) {
            socket.emit("activate", { service: "DevicesService", type: "devices"});

            devicesUpdate(data);
        });
    }

    if (page === "energy") {
        socket.emit("init", { service: "DevicesService", type: "energy live"});

        socket.on("energy live update", function (data: object) {
            socket.emit("activate", { service: "DevicesService", type: "energy live"});

            energyUpdateLiveReadings(data);
        });
    }

    if (page === "home" || page === "spotify") {
        socket.on("spotify update", function (data: object) {
            spotifyUpdatePlayer(data);

            if (page === "spotify") spotifyUpdateDevice(data);
        });

        socket.on("spotify device error", function (data: object) {
            spotifyUpdatePlayer(data);
        });
    }

    if (page === "home" || page === "tasks") {
        socket.emit("init", { service: "TaskService", type: "tasks"});

        socket.on("tasks update", function (data: object) {
            socket.emit("activate", { service: "TaskService", type: "tasks"});

            if (!document.activeElement.classList.contains("task-description")) {
                tasksUpdate(data);
            }
        });
    }

    if (page === "home" || page === "travel") {
        socket.emit("init", { service: "NSService", type: "ns trips"});
        socket.emit("init", { service: "MapService", type: "map routes"});

        socket.on("ns trips update", function (data: object) {
            socket.emit("activate", { service: "NSService", type: "ns trips"});

            travelUpdateTrain(data);
        });

        socket.on("map routes update", function (data: object) {
            socket.emit("activate", { service: "MapService", type: "map routes"});

            travelUpdateMaps(data);
        });
    }

    if (page === "home" || page === "weather") {
        socket.emit("init", { service: "WeatherService", type: "forecast rain"});

        socket.on("forecast update", function (data: object) {
            socket.emit("activate", { service: "WeatherService", type: "forecast"});

            weatherUpdate(data);
        });

        socket.on("rain update", function (data: object) {
            socket.emit("activate", { service: "WeatherService", type: "rain"});

            weatherUpdate(data);
        });

    }

    if (page === "home" || page === "crypto") {
        socket.emit("init", { service: "CryptoService", type: "crypto", value: cryptoGetFilterValues()});

        socket.on("crypto update", function (data: object) {
            socket.emit("activate", { service: "CryptoService", type: "crypto", value: cryptoGetFilterValues()});

            cryptoUpdate(data);
        });
    }
}

/**
 * Method that is executed when the DOM has been loaded completely
 */
function onPageLoad(): void {
    const page = document.querySelector("body").getAttribute("data-page");

    socket.on("connect", function () {
        console.log("Connected to server with id: ", socket.id);
        initializeSockets(page);
    });

    socket.on("disconnect", function (reason: string) {
        console.log("Disconnected from server and reconnecting: ", reason);
        socket.connect();
    });

    socket.on("connect_error", function (reason: object) {
        console.log("Connection error: ", reason);
        socket.connect();
    });

    socket.on("reconnect_error", function (reason: object) {
        console.log("Reconnect error: ", reason);
        socket.connect();
    });

    socket.on("reconnect_failed", function () {
        console.log("Reconnect failed");
        socket.connect();
    });

    socket.on("reconnecting", function () {
        console.log("Reconnecting...");
    });

    socket.on("reconnect", function () {
        console.log("Reconnected");
        initializeSockets(page);
    });

    // Check if the socket is still active and reconnect otherwise
    window.setInterval(function () {
        if (!socket.connected) socket.connect();
    }, 60 * 1000);

    // Override default html links to be handled by JavaScript
    const navLinkElements = document.querySelectorAll(".navigation-link");
    $.each(navLinkElements, function (index, element) {
        element.addEventListener("click", function (event) {
            event.preventDefault();

            window.location.href = element.getAttribute("href");
        });
    });

    // Update time and date every second on the homepage
    const nowTimeElement = document.querySelector("#nowTimeString");
    const nowDateElement = document.querySelector("#nowDateString");
    if (nowTimeElement && nowDateElement) {
        window.setInterval(function () {
            nowTimeElement.innerHTML = momentt(new Date()).format("HH:mm:ss");
            nowDateElement.innerHTML = momentt(new Date()).format("dddd, MMMM D");
        }, 1000);
    }

    // Event listener to enable/disable the status of a service
    const serviceStatusElements = document.querySelectorAll("select[name='service-status']");
    $.each(serviceStatusElements, function(_, element: HTMLSelectElement) {
        element.addEventListener("change", function () {
            const serviceType = element.getAttribute("service-type");
            const value = element.value === "1";

            fetch("/api/app/service/", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    serviceType: serviceType,
                    status: value.toString()
                })
            }).then(function (resp) {
                if (resp.status !== 200) {
                    throw new Error();
                }
                setTimeout(function () {
                    document.location.reload();
                }, 500);
            }).catch(function () {
                element.value = value ? "0" : "1";
            });
        });
    });

    // Mimic Bootstrap modal behavior for unsupported/older JavaScript browsers 
    if (typeof $.fn.modal === 'undefined') {
        const navigationMenuButton = document.querySelector("[data-bs-toggle='modal']");
        if (navigationMenuButton) {
            navigationMenuButton.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                const target = navigationMenuButton.getAttribute("data-bs-target");
                if (!target) return;

                const navigationContainer = document.querySelector(target);
                if (!navigationContainer) return;

                const bodyElement = document.querySelector("body");
                bodyElement.classList.add("modal-open");
                navigationContainer.classList.add("show");
                (navigationContainer as HTMLDivElement).style.display = "block";
                bodyElement.append("<div class='modal-backdrop show'></div>");
            });
        }

        const navigationCloseElements = document.querySelectorAll("[data-bs-dismiss='modal']");
        $.each(navigationCloseElements, function (_, element) {
            element.addEventListener("click", function (event) {
                const target = navigationMenuButton.getAttribute("data-bs-target");
                if (!target) return;

                const navigationContainer = document.querySelector(target);
                if (!navigationContainer) return;

                const bodyElement = document.querySelector("body");
                bodyElement.classList.remove("modal-open");
                navigationContainer.classList.remove("show");
                (navigationContainer as HTMLDivElement).style.display = "none";
                const backdropElement = document.querySelector(".modal-backdrop");
                if (backdropElement) {
                    backdropElement.remove();
                }
            });
        });
    }

    // Mimic Bootstrap accordion behavior for unsupported/older JavaScript browsers 
    if (typeof $.fn.collapse === 'undefined') {
        const accordionElements = document.querySelectorAll("[data-bs-toggle='collapse']");
        $.each(accordionElements, function (_, element) {
            element.addEventListener("click", function () {
                const targetID = element.getAttribute("data-bs-target");
                const targetAccordion = document.querySelector(targetID);
                targetAccordion.classList.toggle("show");

                const parentID = element.getAttribute("data-bs-parent");
                const parentChilds = document.querySelector(parentID).querySelectorAll(".accordion-collapse:not(" + targetID + ")");
                $.each(parentChilds, function (_, child) {
                    child.classList.remove("show");
                });
            });
        });
    }

//// CALENDAR-START ////
    if (page === "home" || page === "calendar") {
        showUpdateSpinner("calendar");

        window.setInterval(function () {
            calendarUpdateEventsHome();
        }, 5 * 60 * 1000);

        onCalendarToggleEventsHomeListeners();

        hideUpdateSpinner("calendar");

        if (page === "calendar") {

            window.setInterval(function () {
                calendarUpdateEvents();
            }, 5 * 60 * 1000);

            hideUpdateSpinner("calendar");

            // Browse previous or next month calendar view
            const changeMonthElements = document.querySelectorAll(".change-month");
            $.each(changeMonthElements, function (_, element) {
                element.addEventListener("click", function () {
                    calendarUpdateMonth(element, element.getAttribute("data-next") === "true");
                });
            });

            // Browse previous or next week events
            const changeWeekEventsElements = document.querySelectorAll(".events-change-week");
            $.each(changeWeekEventsElements, function (_, element) {
                element.addEventListener("click", function () {
                    calendarSetNextPreviousEvents(element, element.getAttribute("data-next") === "true");
                });
            });

            // Go to events of week by clicking the week nunber in the month calendar
            const showEventsWeekNumber = document.querySelectorAll(".show-events-week-number");
            $.each(showEventsWeekNumber, function (_, element) {
                element.addEventListener("click", function () {
                    const targetEvents = document.getElementById("calendarEventsWrapper");
                    const targetMonth = document.getElementById("calendarMonthContainer");
                    const year = targetMonth.getAttribute("data-year");
                    const week = element.getAttribute("data-week");

                    targetEvents.setAttribute("data-year", year.toString());
                    targetEvents.setAttribute("data-week", week.toString());

                    calendarUpdateEvents();
                });
            });

            // Click to toggle calendar and events
            const calendarToggleElements = document.querySelectorAll(".calendar-toggle");
            $.each(calendarToggleElements, function (_, element) {
                element.addEventListener("click", function () {
                    const calendarID = element.getAttribute("data-id");
                    const status = (element as HTMLInputElement).checked;
                    doCalendarToggleCalendarAction(element, calendarID, status);
                });
            });

            const calendarList = document.querySelector("#calendarList");
            const newCalendarWrapper = document.querySelector("#calendarNewUpdateWrapper");
            const deleteCalendarButton = document.querySelector("#deleteCalendar");

            // Submit add/update calendar form
            const newUpdateCalendarForm = document.querySelector("#newUpdateCalendarForm") as HTMLFormElement;
            if (newUpdateCalendarForm) {
                newUpdateCalendarForm.addEventListener("submit", function (event) {
                    doCalendarAddEditCalendarAction(event, newUpdateCalendarForm);

                    newUpdateCalendarForm.reset();
                });
            }

            // Toggle new calendar
            const newCalendarToggle = document.querySelector("#newCalendarToggle");
            if (newCalendarToggle) {
                newCalendarToggle.addEventListener("click", function () {
                    newUpdateCalendarForm.reset();
                    newCalendarWrapper.classList.remove("d-none");
                    deleteCalendarButton.classList.add("d-none");
                    calendarList.classList.add("d-none");
                });
            }

            // Cancel add/update calendar
            const cancelCalenderElement = document.querySelector("#cancelCalendar");
            if (cancelCalenderElement) {
                cancelCalenderElement.addEventListener("click", function () {
                    newUpdateCalendarForm.reset();
                    newCalendarWrapper.classList.add("d-none");
                    deleteCalendarButton.classList.add("d-none");
                    calendarList.classList.remove("d-none");
                });
            }

            // Delete a calendar
            const deleteCalendarElement = document.querySelector("#deleteCalendar");
            if (deleteCalendarElement) {
                deleteCalendarElement.addEventListener("click", function () {
                    doCalendarDeleteAction();

                    newUpdateCalendarForm.reset();
                    newCalendarWrapper.classList.add("d-none");
                    deleteCalendarButton.classList.add("d-none");
                    calendarList.classList.remove("d-none");
                });
            }

            // Choose the color of the calendar in the form
            const calendarColorToggleElements = document.querySelectorAll(".calendar-color-toggle");
            $.each(calendarColorToggleElements, function (_, element: HTMLInputElement) {
                const color = element.getAttribute("data-color");

                element.addEventListener("click", function () {
                    $.each(calendarColorToggleElements, function (_, el: HTMLInputElement) {
                        el.checked = false;
                    });
                    element.checked = true;
                    (document.querySelector("#selectedCalendarColor") as HTMLInputElement).value = color;
                });
            });

            // Show the calendar update window
            const calendarUpdateElements = document.querySelectorAll(".calendar-update");
            $.each(calendarUpdateElements, function (_, element) {
                element.addEventListener("click", function () {
                    calendarShowUpdateCalendarWindow(element);
                    deleteCalendarButton.classList.remove("d-none");
                });
            });
        }
    }
//// CALENDAR-END ////

//// DEVICES-START ////
    if (page === "home" || page === "devices") {
        onDevicesSceneListeners();
        onDevicesSwitchListeners();
        onDevicesDimListeners();
        onDevicesToggleBrightnessColorListeners();
        onDevicesColorListeners();
        onDevicesToggleVisibilityListeners();
        onDevicesToggleDeviceVisibilityListeners();
        devicesToggleDeviceTypes();
        clickAnimationListeners();
    }

    // Button to reinitialize devices when enabled service
    const reinitializeDevicesElement = document.querySelector("#reinitializeDevices");
    if (reinitializeDevicesElement) {
        reinitializeDevicesElement.addEventListener("click", function (event) {
            event.preventDefault();

            fetch("/api/devices/reinit", { method: "POST" }).then(function () {
                setTimeout(function () {
                    document.location.reload();
                }, 1000);
            });
        });
    }
//// DEVICES-END ////

//// ENERGY-START ////
    if (page === "energy") {
        energyRenderCharts();

        // Event listeners for setting the next or previous month for historical readings
        const changeMonthElements = document.querySelectorAll(".change-month");
        $.each(changeMonthElements, function (_, element) {
            element.addEventListener("click", function () {
                energyUpdateHistoricalReadings(element, element.getAttribute("data-next") === "true");
            });
        });
    }
//// ENERGY-END ////

//// SETTINGS-START ////
    if (page === "settings") {
        
        // Event listeners to add settings
        const addSettingFormElements = document.querySelectorAll(".addSettingForm");
        $.each(addSettingFormElements, function (_, element: HTMLFormElement) {
            element.addEventListener("submit", function (event) {
                doSettingsAddAction(event, element);
            });
        });

        // Event listeners to update settings
        const updateSettingFormElements = document.querySelectorAll(".updateSettingForm");
        $.each(updateSettingFormElements, function (_, element: HTMLFormElement) {
            element.addEventListener("submit", function (event) {
                doSettingsUpdateAction(event, element);
            });
        });

        // Event listeners to delete settings
        const deleteSettingButtonElements = document.querySelectorAll(".delete-setting");
        $.each(deleteSettingButtonElements, function (_, element: Element) {
            element.addEventListener("click", function (event) {
                doSettingsDeleteAction(event, element);
            });
        });

        // Event listener to restart the server programmatically
        const restartServerElement = document.querySelector("#restartServer");
        if (restartServerElement) {
            restartServerElement.addEventListener("click", function () {
                fetch("/api/app/restart").then(function () {
                    console.log('RESTARTING SERVER, PLEASE WAIT');
                });
            });
        }
    }
//// SETTINGS-END ////

//// LOGS-START ////
    if (page === "logs") {
        clickAnimationListeners();

        // Event listener to clear a log
        const clearLogButton = document.querySelector("#clearLog");
        if (clearLogButton) {
            clearLogButton.addEventListener("click", function (event) {
                event.preventDefault();

                const logName = clearLogButton.getAttribute("data-name");

                fetch("/api/settings/logs/" + logName, {
                    method: "DELETE"
                }).then(function (req) {
                    req.clone().json().then(function (obj) {
                        if (obj === true) {
                            clearLogButton.setAttribute("style", "--animate-color: var(--bs-success)");
                            setTimeout(function () {
                                document.location.reload();
                            }, 1000);
                        } else {
                            clearLogButton.setAttribute("style", "--animate-color: var(--bs-danger)");
                        }
                    });
                });
            });
        }
    }
//// LOGS-END ////

//// SPOTIFY-START ////
    if (page === "home" || page === "spotify") {

        onSpotifyPlayerListeners();
        onSpotifyVolumeListeners();
        onSpotifyCollectionListeners();
        onSpotifySearchListeners();
        onSpotifyCategoryListeners();
        onSpotifyFollowListeners();
        onSpotifyDeviceListeners();
    }

    // Event listener for reinitializing spotify after enabling the server
    const reinitializeSpotifyElement = document.querySelector("#reinitializeSpotify");
    if (reinitializeSpotifyElement) {
        reinitializeSpotifyElement.addEventListener("click", function (event) {
            event.preventDefault();

            fetch("/api/spotify/reinit", { method: "POST" });
        });
    }
//// SPOTIFY-END ////

//// TASKS-START ////
    if (page === "home" || page === "tasks") {
        
        // Event listener for adding a new task
        const newTaskForm = document.querySelector("#newTaskForm") as HTMLFormElement;
        if (newTaskForm) {
            newTaskForm.addEventListener("submit", function (event) {
                doTasksAddAction(event);
            });
        }

        // Event listeners for completing tasks
        const toggleCompletedButtons = document.querySelectorAll(".toggle-task-visibility");
        $.each(toggleCompletedButtons, function (_, element) {
            element.addEventListener("click", function () {
                tasksToggleCompleted(element.getAttribute("data-toggle"));
            });
        });

        // Event listeners for toggling unflagged tasks
        const toggleUnflaggedButtons = document.querySelectorAll(".toggle-unflagged");
        $.each(toggleUnflaggedButtons, function (_, element) {
            element.addEventListener("click", function () {
                element.classList.add("d-none");
                document.querySelector(element.getAttribute("data-toggle-inverse")).classList.remove("d-none");

                const show = element.getAttribute("data-toggle") === "show";
                const target = element.getAttribute("data-target");
                if (show) {
                    document.querySelector(target).classList.remove("d-none");
                } else {
                    document.querySelector(target).classList.add("d-none");
                }
            });
        });

        // Event listeners for toggle delete buttons for tasks
        const toggleDeleteButtons = document.querySelectorAll(".toggle-delete");
        $.each(toggleDeleteButtons, function (_, element) {
            element.addEventListener("click", function () {

                element.classList.add("d-none");
                document.querySelector(element.getAttribute("data-toggle-inverse")).classList.remove("d-none");

                const show = element.getAttribute("data-toggle") === "show";
                const taskItems = document.querySelectorAll(".task-item");
                $.each(taskItems, function (_, el) {
                    if (show) {
                        el.querySelector(".task-delete").classList.remove("d-none");
                    } else {
                        el.querySelector(".task-delete").classList.add("d-none");
                    }
                });
            });
        });

        onTasksCompleteListeners();
        onTasksFlagListeners(true);
        onTasksDeleteListeners();
        onTasksDescriptionChangeListeners();
    }
//// TASKS-END ////

//// TRAVEL-START ////
    if (page === "home" || page === "travel") {
        onTravelTypeListeners();

        if (page === "travel") {
            onTravelAddressListeners();
            onTravelMapRouteListeners();
            onTravelOpenMapListeners();
            onTravelTrainStationListeners();
            onTravelTrainRouteListeners();
            onTravelToggleTrainTransfersListeners();
        }
    }
//// TRAVEL-END ////

//// CRYPTO-START ////
    if (page === "crypto") {

        // Event change listener for selecting page number value
        const pageSelectElement = document.querySelector("select[name='crypto-select-page']");
        if (pageSelectElement) {
            pageSelectElement.addEventListener("change", function (event) {
                event.preventDefault();

                socket.emit("event", { service: "CryptoService", type: "crypto coin pagination", value: cryptoGetFilterValues()});
            });
        }
    }
//// CRYPTO-END ////
}

document.addEventListener("DOMContentLoaded", onPageLoad);
