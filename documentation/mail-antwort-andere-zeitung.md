
>Könnten Sie mir sagen, wie der technische Ablauf dafür wäre? Wie wird auf die Daten zugegriffen? Muss etwas auf den Servern, auf denen die Daten liegen, installiert werden?

Wenn es im Web erreichbar ist können wir alle Daten ohne Probleme mit unseren Scraper laden, da muss nichts weiter gemacht werden. 

>Welche Schnittstellen müssten zur Verfügung stehen? Welchen zeitlichen Rahmen müsste für eine allfällige Implementierung und schliesslich den Betrieb eingerechnet werden?

Wir können das sicher ohne Probleme programmieren, wir bräuchten nur einen Ansprechpartner der in unseren Slack Channel kommt und der weiss wo welche Informationen zu finden sind. Zeit kommt ein bischen darauf an was das Zeil ist. Wenn wir beim Feed die Bilder automatisch runterladen, dann manuell zurecht schneiden und die Schlagzeilen per Hand schreiben können wir das an nem Wochenende an Start bringen. Alles andere ist schwer zu sagen ohne konkretere Pläne.

>Sie haben Frau Libiszewski geschrieben, dass es auch darauf ankommen würde, in welcher Struktur und Qualität die Daten vorliegen würden. Wir sind gerade dabei, die Metadaten nach METS/ALTO zu migrieren. Die Originaldaten wurden vollautomatisch generiert. Volltext und Struktur sind entsprechend von teilweise schlechter Qualität. Die Daten liegen auf einer Linux-Infrastruktur. Die Zeitungen sind in Hefte (also Ausgaben) unterteilt, wobei in jedem Ausgaben-Folder ein METS-File, ein PDF-File (Ausgabe mit OCR) und zwei weitere Folder mit den jp2-Files pro Seite und den PDF-Files pro Seite liegen.

Ja also wir hatten auch festgestellt das die Qualität nicht super ist und schreiben im Moment sowieso noch alle Tweettexte per Hand. Wir sind aber dabei das weiter zu automatisieren. Auch die Bilder der Scans schneiden wir per Hand aus, aber zumindest das sollte sich aber auf jeden Fall bald automatisieren lassen. Im Moment hapert das bei der Volkszeitung haupsächlich daran das es immer noch kein Interface gibt was die .png Bilder mit den METS/ALTO Files in verbindung setzt.

>Die Zeitungen sind über eine Webplatform frei zugänglich.

>Ob und wie Sie auf die Linux-Umgebung zugreifen können, ist unklar, da wir diese nicht selbst betreiben. Oder wäre es für Sie möglich, die Daten über das Web-Interface abzugreifen?

Wir haben auch für das Zefys System ein Webscraper geschrieben der uns alle Scans herunterlädt, das sollte also kein Problem sein.