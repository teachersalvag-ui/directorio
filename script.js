// --- Data Mocking & Fetching ---
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1pQwMcSGn4HuLMtxG7Mz1w0jc7cY0eSb5BOgV7m-m3TU/gviz/tq?tqx=out:csv";
let studentsData = [];

async function fetchStudentsData() {
    return new Promise((resolve, reject) => {
        Papa.parse(SHEET_URL, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                const data = results.data;
                const mapped = data.map((row, index) => {
                    const rowVals = Object.values(row);
                    return {
                        id: String(index),
                        rawInfo: (rowVals.join(' ') + ' ' + (row["¿Es usted colombiano?"] === 'No' ? 'extranjero' : 'colombiano') + ' ' + (rowVals[7] ? rowVals[7] + ' años' : '')).toLowerCase(),
                        nombre: row["Apellidos y Nombres del estudiante"] || "Desconocido",
                        documento: row["Número de identificación del estudiante"] || "N/A",
                        tipoDoc: row["Tipo de documento"] || "N/A",
                        edad: rowVals[8] || "N/A", // This has "X años y Y meses"
                        edadNumerica: rowVals[7] || "N/A",
                        genero: rowVals[17] || "N/A",
                        esColombiano: row["¿Es usted colombiano?"] || "N/A",
                        lugarNacimiento: row["Lugar de Nacimiento"] || "N/A",
                        repitiendo: row["¿Estas repitiendo el año?"] || "N/A",
                        afro: row["¿Es usted afro colombiano?"] || "N/A",
                        indigena: row["¿Es usted indígena o pertenece a alguna etnia?"] || "N/A",
                        desplazado: row["¿Es usted desplazado por la violencia?"] || "N/A",
                        fechaNacimiento: row["Fecha de Nacimiento"] || "N/A",
                        direccion: row["Dirección"] || "N/A",
                        barrio: row["Barrio"] || "N/A",

                        contactos: {
                            telFijo: row["Número de teléfono fijo del domicilio del estudiante (Si tiene)"] || "N/A",
                            celular: row["Número de teléfono celular del estudiante (si tiene)"] || "N/A",
                            madre: {
                                nombre: row["Nombre de la madre del estudiante"] || "N/A",
                                celular: row["Número de teléfono celular de la madre"] || "N/A"
                            },
                            padre: {
                                nombre: row["Nombre del padre del estudiante"] || "N/A",
                                celular: row["Número de teléfono celular del padre"] || "N/A"
                            },
                            acudientePrincipal: {
                                nombre: row["Nombre completo de su acudiente "] || "N/A",
                                celular: row["Numero(s) telefónico(s) celulares y fijos de su acudiente"] || "N/A",
                                relacion: row["Parentesco de su acudiente con el estudiante"] || "N/A"
                            }
                        },

                        salud: {
                            grupoSanguineo: row["Grupo Sanguineo y RH"] ? row["Grupo Sanguineo y RH"].slice(0, -1) : "N/A",
                            rh: row["Grupo Sanguineo y RH"] ? row["Grupo Sanguineo y RH"].slice(-1) : "",
                            eps: row["E.P.S. "] || row["E.P.S."] || "N/A",
                            emergencias: row["¿En que sitio lo atiende la EPS en caso de emergencia?"] || "N/A",
                            condicionesEspeciales: row["¿Tiene alguna condición médica especial?"] || "Ninguna",
                            medicamentos: row["¿Tomas algún medicamento?"] || "Ninguno"
                        },

                        contextoFamiliar: {
                            viveCon: row["Vivo con"] || "N/A",
                            ocupacionMadre: row["Ocupación de la madre"] || "N/A",
                            ocupacionPadre: row["Ocupación del padre"] || "N/A",
                            hermanosInfo: (row["¿Tienes herman@s en el colegio?"] === "Sí")
                                ? `${row["Nombre(s) de su(s) herman@(s)"]} (${row["Curso en el que está(n) su(s) herma@(s)"]})`
                                : "Ninguno"
                        }
                    };
                }).filter(s => s.nombre !== "Desconocido" && s.nombre.trim() !== "");

                resolve(mapped);
            },
            error: function (error) {
                console.error("Error fetching CSV:", error);
                reject(error);
            }
        });
    });
}

// --- App State & DOM Elements ---
const APP_PASSWORD = "9584";
let currentStudents = [];

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');
const appContent = document.getElementById('app-content');
const searchInput = document.getElementById('search-input');
const studentsGrid = document.getElementById('students-grid');
const statsContainer = document.getElementById('stats-container');
const resultsCount = document.getElementById('results-count');
const studentModal = document.getElementById('student-modal');
const closeModal = document.getElementById('close-modal');
const modalContent = document.getElementById('modal-content');

// --- Initialization ---
function initApp() {
    setupAuthListeners();
}

// --- Authentication ---
function setupAuthListeners() {
    const tryLogin = async () => {
        if (passwordInput.value === APP_PASSWORD) {
            loginBtn.textContent = 'Cargando...';
            loginBtn.disabled = true;

            try {
                studentsData = await fetchStudentsData();
                currentStudents = [...studentsData];

                loginOverlay.classList.add('hidden');
                appContent.classList.remove('hidden');

                renderStats();
                populateFilters();
                renderStudents(currentStudents);
                setupAppListeners();
                searchInput.focus();
            } catch (error) {
                alert("Error cargando los datos de Google Sheets. Revisa tu conexión o permisos.");
                loginBtn.textContent = 'Ingresar';
                loginBtn.disabled = false;
            }
        } else {
            loginError.classList.remove('hidden');
            passwordInput.classList.add('border-danger', 'ring-danger');
            setTimeout(() => {
                loginError.classList.add('hidden');
                passwordInput.classList.remove('border-danger', 'ring-danger');
            }, 3000);
        }
    };

    loginBtn.addEventListener('click', tryLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') tryLogin();
    });
}

// --- Listeners ---
function setupAppListeners() {
    const filterEdad = document.getElementById('filter-edad');
    const filterSexo = document.getElementById('filter-sexo');
    const filterNac = document.getElementById('filter-nacionalidad');
    const filterRepitiendo = document.getElementById('filter-repitiendo');
    const filterAfro = document.getElementById('filter-afro');
    const filterIndigena = document.getElementById('filter-indigena');
    const filterDesplazado = document.getElementById('filter-desplazado');
    const filterLugar = document.getElementById('filter-lugar');

    const updateFilters = () => {
        const term = searchInput.value.toLowerCase().trim();
        const fEdad = filterEdad ? filterEdad.value : "";
        const fSexo = filterSexo ? filterSexo.value.toLowerCase() : "";
        const fNac = filterNac ? filterNac.value : "";

        const fRep = filterRepitiendo ? filterRepitiendo.value : "";
        const fAfro = filterAfro ? filterAfro.value : "";
        const fIndigena = filterIndigena ? filterIndigena.value : "";
        const fDesplazado = filterDesplazado ? filterDesplazado.value : "";
        const fLugar = filterLugar ? filterLugar.value : "";

        let filtered = studentsData;

        // Apply dropdown filters
        if (fEdad) {
            filtered = filtered.filter(s => s.edadNumerica == fEdad);
        }
        if (fSexo) {
            filtered = filtered.filter(s => s.genero.toLowerCase() === fSexo);
        }
        if (fNac === "Colombiano") {
            filtered = filtered.filter(s => s.esColombiano === "Sí");
        } else if (fNac === "Extranjero") {
            filtered = filtered.filter(s => s.esColombiano === "No");
        }
        if (fRep) {
            filtered = filtered.filter(s => s.repitiendo === fRep);
        }
        if (fAfro) {
            filtered = filtered.filter(s => s.afro === fAfro);
        }
        if (fIndigena) {
            filtered = filtered.filter(s => s.indigena === fIndigena);
        }
        if (fDesplazado) {
            filtered = filtered.filter(s => s.desplazado === fDesplazado);
        }
        if (fLugar) {
            filtered = filtered.filter(s => s.lugarNacimiento === fLugar);
        }

        // Apply search input (keywords/questions)
        if (term) {
            const keywords = term.replace(/\b(cuantos|cuántos|tienen|quienes|quiénes|son|los|las|el|la|un|una|de|en|por|que|qué|busco|quiero|ver)\b/g, '').trim().split(/\s+/).filter(k => k);
            filtered = filtered.filter(user => {
                if (keywords.length === 0) return true;
                return keywords.every(kw => user.rawInfo.includes(kw));
            });
        }

        currentStudents = filtered;
        renderStudents(currentStudents);
    };

    searchInput.addEventListener('input', updateFilters);
    if (filterEdad) filterEdad.addEventListener('change', updateFilters);
    if (filterSexo) filterSexo.addEventListener('change', updateFilters);
    if (filterNac) filterNac.addEventListener('change', updateFilters);
    if (filterRepitiendo) filterRepitiendo.addEventListener('change', updateFilters);
    if (filterAfro) filterAfro.addEventListener('change', updateFilters);
    if (filterIndigena) filterIndigena.addEventListener('change', updateFilters);
    if (filterDesplazado) filterDesplazado.addEventListener('change', updateFilters);
    if (filterLugar) filterLugar.addEventListener('change', updateFilters);

    closeModal.addEventListener('click', () => {
        studentModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore scroll
    });

    studentModal.addEventListener('click', (e) => {
        if (e.target === studentModal) {
            studentModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !studentModal.classList.contains('hidden')) {
            studentModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
}

// --- Render Functions ---

function isCriticalHealth(saludInfo) {
    const condicionLower = saludInfo.condicionesEspeciales.toLowerCase();
    const medicamentosLower = saludInfo.medicamentos.toLowerCase();

    const isNingunaCondicion = condicionLower === 'ninguna' || condicionLower === 'no' || condicionLower === 'ninguno';
    const isNingunMedicamento = medicamentosLower === 'ninguno' || medicamentosLower === 'no' || medicamentosLower === 'ninguna';

    return !isNingunaCondicion || !isNingunMedicamento;
}

function populateFilters() {
    const filterEdad = document.getElementById('filter-edad');
    const filterLugar = document.getElementById('filter-lugar');

    if (filterEdad) {
        // Get unique age values
        const uniqueAges = [...new Set(studentsData.map(s => s.edadNumerica).filter(e => e && e !== "N/A"))];
        const sortedAges = uniqueAges.map(Number).sort((a, b) => a - b);
        let options = '<option value="">Todas las Edades</option>';
        sortedAges.forEach(age => {
            options += `<option value="${age}">${age} años</option>`;
        });
        filterEdad.innerHTML = options;
    }

    if (filterLugar) {
        // Get unique birthplaces
        const uniquePlaces = [...new Set(studentsData.map(s => s.lugarNacimiento).filter(p => p && p !== "N/A"))].sort();
        let options = '<option value="">Cualquier Lugar de Nac.</option>';
        uniquePlaces.forEach(place => {
            options += `<option value="${place}">${place}</option>`;
        });
        filterLugar.innerHTML = options;
    }
}

function renderStats() {
    const total = studentsData.length;
    let mayoresDeEdad = 0;

    studentsData.forEach(s => {
        if (parseInt(s.edad) >= 18) mayoresDeEdad++;
    });

    const alertasSalud = studentsData.filter(s => isCriticalHealth(s.salud)).length;

    statsContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition hover:shadow-md">
            <div class="flex items-center text-primary mb-2">
                <i class="fa-solid fa-users fa-lg mr-2"></i>
                <h3 class="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500">Total Estudiantes</h3>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-gray-800">${total}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition hover:shadow-md">
            <div class="flex items-center text-secondary mb-2">
                <i class="fa-solid fa-user-check fa-lg mr-2"></i>
                <h3 class="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500">Mayores de Edad</h3>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-gray-800">${mayoresDeEdad} <span class="text-xs sm:text-sm font-normal text-gray-400">est.</span></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition hover:shadow-md">
            <div class="flex items-center text-danger mb-2">
                <i class="fa-solid fa-heart-pulse fa-lg mr-2"></i>
                <h3 class="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500">Alertas de Salud</h3>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-gray-800">${alertasSalud} <span class="text-xs sm:text-sm font-normal text-gray-400">casos</span></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition hover:shadow-md flex flex-col justify-center">
            <div class="text-center">
                <p class="text-xs text-gray-400 mb-1">Datos actualizados a</p>
                <p class="text-sm font-bold text-gray-700 bg-gray-100 py-1 px-3 rounded-full inline-block">${new Date().toLocaleDateString('es-ES')}</p>
            </div>
        </div>
    `;
}

function renderStudents(students) {
    resultsCount.textContent = `${students.length} resultados`;

    if (students.length === 0) {
        studentsGrid.innerHTML = `
            <div class="col-span-full py-12 text-center text-gray-500">
                <i class="fa-solid fa-search text-4xl mb-3 text-gray-300"></i>
                <p class="text-lg">No se encontraron estudiantes con ese criterio de búsqueda.</p>
            </div>
        `;
        return;
    }

    studentsGrid.innerHTML = students.map(student => {
        const hasWarning = isCriticalHealth(student.salud);
        return `
            <div class="student-card bg-white rounded-2xl shadow-sm border ${hasWarning ? 'border-red-200' : 'border-gray-200'} overflow-hidden flex flex-col cursor-pointer" onclick="openStudentModal('${student.id}')">
                <div class="p-5 flex-grow">
                    <div class="flex justify-between items-start mb-3">
                        <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center">
                            ${student.nombre.charAt(0)}
                        </div>
                        ${hasWarning ? '<div title="Alerta Médica" class="health-alert-pulse bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center"><i class="fa-solid fa-notes-medical"></i></div>' : ''}
                    </div>
                    <h3 class="font-bold text-lg text-gray-800 leading-tight mb-1">${student.nombre}</h3>
                    <p class="text-sm text-gray-500 mb-4"><i class="fa-regular fa-id-card mr-1"></i> ${student.tipoDoc} ${student.documento}</p>
                    <div class="flex gap-2 text-xs">
                        <span class="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">${student.edad}</span>
                        <span class="${hasWarning ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} px-2 py-1 rounded-md font-medium">RH: ${student.salud.grupoSanguineo}${student.salud.rh}</span>
                    </div>
                </div>
                <div class="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-sm">
                    <span class="text-primary font-medium group-hover:underline">Ver perfil completo</span>
                    <i class="fa-solid fa-chevron-right text-gray-400"></i>
                </div>
            </div>
        `;
    }).join('');
}

window.openStudentModal = function (id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) return;

    const hasWarning = isCriticalHealth(student.salud);

    modalContent.innerHTML = `
        <!-- Header -->
        <div class="${hasWarning ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'} p-6 border-b rounded-t-2xl">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full bg-white text-gray-700 shadow-sm font-bold text-2xl flex items-center justify-center">
                    ${student.nombre.charAt(0)}
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">${student.nombre}</h2>
                    <p class="text-gray-600 font-medium">${student.tipoDoc} ${student.documento} • ${student.edad}</p>
                </div>
            </div>
        </div>
        
        <!-- Tabs/Sections -->
        <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <!-- Section: Personal & Familiar -->
                <div class="space-y-6">
                    <section>
                        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center border-b pb-2"><i class="fa-solid fa-user text-primary mr-2"></i>Datos Personales</h3>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Fecha Nacimiento:</span> ${student.fechaNacimiento}</li>
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Dirección:</span> ${student.direccion}</li>
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Barrio:</span> ${student.barrio}</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center border-b pb-2"><i class="fa-solid fa-house-chimney text-primary mr-2"></i>Contexto Familiar</h3>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Vive con:</span> ${student.contextoFamiliar.viveCon}</li>
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Ocupación Madre:</span> ${student.contextoFamiliar.ocupacionMadre}</li>
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Ocupación Padre:</span> ${student.contextoFamiliar.ocupacionPadre}</li>
                            <li><span class="font-semibold text-gray-800 inline-block w-32">Hermanos:</span> ${student.contextoFamiliar.hermanosInfo}</li>
                        </ul>
                    </section>
                </div>

                <!-- Section: Contactos & Salud -->
                <div class="space-y-6">
                    <section class="${hasWarning ? 'bg-red-50 -mx-4 -mt-4 p-4 rounded-xl border border-red-100 shadow-sm' : ''}">
                        <h3 class="text-lg font-bold ${hasWarning ? 'text-red-700' : 'text-gray-800'} mb-3 flex items-center border-b ${hasWarning ? 'border-red-200' : ''} pb-2">
                            <i class="fa-solid fa-notes-medical ${hasWarning ? 'text-red-500' : 'text-primary'} mr-2"></i>Salud
                            ${hasWarning ? '<span class="ml-auto text-xs bg-red-200 text-red-800 px-2 py-1 rounded font-bold">ATENCIÓN MÉDICA</span>' : ''}
                        </h3>
                        <ul class="space-y-2 text-sm ${hasWarning ? 'text-red-900' : 'text-gray-600'}">
                            <li><span class="font-semibold inline-block w-36 cursor-default" title="Grupo Sanguíneo y RH">Tipo de Sangre:</span> ${student.salud.grupoSanguineo}${student.salud.rh}</li>
                            <li><span class="font-semibold inline-block w-36">EPS:</span> ${student.salud.eps}</li>
                            <li><span class="font-semibold inline-block w-36">Centro Emergencias:</span> ${student.salud.emergencias}</li>
                            <li class="${hasWarning ? 'font-bold' : ''}"><span class="font-semibold inline-block w-36">Condiciones:</span> ${student.salud.condicionesEspeciales}</li>
                            <li class="${hasWarning ? 'font-bold' : ''}"><span class="font-semibold inline-block w-36">Medicamentos:</span> ${student.salud.medicamentos}</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center border-b pb-2"><i class="fa-solid fa-phone text-primary mr-2"></i>Contactos de Emergencia</h3>
                        
                        <div class="space-y-3">
                            <!-- Estudiante -->
                            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div>
                                    <p class="text-xs text-gray-500 font-semibold mb-0.5"><i class="fa-solid fa-mobile-screen mr-1"></i>ESTUDIANTE</p>
                                    <p class="text-sm font-bold text-gray-700">${student.contactos.celular}</p>
                                </div>
                                <a href="tel:${student.contactos.celular}" class="bg-secondary hover:bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition" title="Llamar al estudiante">
                                    <i class="fa-solid fa-phone"></i>
                                </a>
                            </div>

                            <!-- Acudiente Principal -->
                            <div class="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                <div>
                                    <p class="text-xs text-indigo-500 font-bold mb-0.5"><i class="fa-solid fa-star mr-1"></i>ACUDIENTE (${student.contactos.acudientePrincipal.relacion})</p>
                                    <p class="text-sm font-bold text-indigo-900">${student.contactos.acudientePrincipal.nombre}</p>
                                </div>
                                <a href="tel:${student.contactos.acudientePrincipal.celular}" class="bg-primary hover:bg-indigo-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition shadow-md" title="Llamar al acudiente principal">
                                    <i class="fa-solid fa-phone"></i>
                                </a>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <!-- Madre -->
                                <div class="flex flex-col justify-between items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div class="mb-2">
                                        <p class="text-xs text-gray-500 font-semibold mb-0.5">MADRE</p>
                                        <p class="text-xs font-bold text-gray-700 truncate w-24" title="${student.contactos.madre.nombre}">${student.contactos.madre.nombre}</p>
                                        <p class="text-xs font-mono text-indigo-600 mt-1">${student.contactos.madre.celular}</p>
                                    </div>
                                    <a href="tel:${student.contactos.madre.celular}" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition w-full" title="Llamar a la madre">
                                        <i class="fa-solid fa-phone mr-1"></i> Llamar
                                    </a>
                                </div>

                                <!-- Padre -->
                                <div class="flex flex-col justify-between items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div class="mb-2">
                                        <p class="text-xs text-gray-500 font-semibold mb-0.5">PADRE</p>
                                        <p class="text-xs font-bold text-gray-700 truncate w-24" title="${student.contactos.padre.nombre}">${student.contactos.padre.nombre}</p>
                                        <p class="text-xs font-mono text-indigo-600 mt-1">${student.contactos.padre.celular}</p>
                                    </div>
                                    <a href="tel:${student.contactos.padre.celular}" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition w-full" title="Llamar al padre">
                                        <i class="fa-solid fa-phone mr-1"></i> Llamar
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `;

    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    studentModal.classList.remove('hidden');
}

// Boot up
document.addEventListener('DOMContentLoaded', initApp);
