import svgPaths from "./svg-kr62jflvl6";
import imgWhatsAppImage20241111At1155466 from "figma:asset/d687566a86d079c1f8677630409fa2a8613449f8.png";
import imgImage83 from "figma:asset/72ea825c11d147524c6819e1c447d85b7f5b8f9d.png";

function Ecommerce() {
  return (
    <div className="relative shrink-0 w-full" data-name="Ecommerce">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[10px] items-center p-[12px] relative w-full">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[14px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            E - Commerce
          </p>
        </div>
      </div>
    </div>
  );
}

function Boxes() {
  return (
    <div className="overflow-clip relative shrink-0 size-[15px]" data-name="boxes 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="Group 417">
          <path d={svgPaths.p4e9c00} fill="var(--fill-0, #E4E8EB)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Product() {
  return (
    <div className="bg-[#3577f0] relative rounded-[5px] shrink-0 w-full" data-name="Product">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <Boxes />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#e4e8eb] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Produk
          </p>
        </div>
      </div>
    </div>
  );
}

function Kategori() {
  return (
    <div className="relative shrink-0 w-full" data-name="Kategori">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <div className="relative shrink-0 size-[15px]" data-name="Vector">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
              <path d={svgPaths.p10df14c0} fill="var(--fill-0, #B5B5C3)" id="Vector" />
            </svg>
          </div>
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Kategori
          </p>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="shield-check 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g clipPath="url(#clip0_1_538)" id="shield-check 1">
          <path d={svgPaths.p8377200} fill="var(--fill-0, #B5B5C3)" id="Vector" />
          <path d={svgPaths.pb559980} fill="var(--fill-0, #B5B5C3)" id="Vector_2" />
        </g>
        <defs>
          <clipPath id="clip0_1_538">
            <rect fill="white" height="15" width="15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Garansi() {
  return (
    <div className="relative shrink-0 w-full" data-name="Garansi">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <ShieldCheck />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Garansi
          </p>
        </div>
      </div>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center justify-center relative shrink-0 w-full">
      <Product />
      <Kategori />
      <Garansi />
    </div>
  );
}

function Sidebar() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Sidebar 1">
      <Ecommerce />
      <Frame13 />
    </div>
  );
}

function Ecommerce1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Ecommerce">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[10px] items-center p-[12px] relative w-full">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[14px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Entraverse Supplier
          </p>
        </div>
      </div>
    </div>
  );
}

function FlagFill() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="flag-fill (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="flag-fill (1) 1">
          <path d={svgPaths.p35892e80} fill="var(--fill-0, #B5B5C3)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Report() {
  return (
    <div className="relative shrink-0 w-full" data-name="Report">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <FlagFill />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Supervisor
          </p>
        </div>
      </div>
    </div>
  );
}

function Journals() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="journals 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g clipPath="url(#clip0_1_546)" id="journals 1">
          <path d={svgPaths.pf0ae000} fill="var(--fill-0, #7E8299)" id="Vector" />
          <path d={svgPaths.p25aba280} fill="var(--fill-0, #7E8299)" id="Vector_2" />
        </g>
        <defs>
          <clipPath id="clip0_1_546">
            <rect fill="white" height="15" width="15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Report1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Report">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <Journals />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Database Supplier
          </p>
        </div>
      </div>
    </div>
  );
}

function BagPlus() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="bag-plus 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g clipPath="url(#clip0_1_542)" id="bag-plus 1">
          <path clipRule="evenodd" d={svgPaths.p2c1caa00} fill="var(--fill-0, #B5B5C3)" fillRule="evenodd" id="Vector" />
          <path d={svgPaths.p35615500} fill="var(--fill-0, #B5B5C3)" id="Vector_2" />
        </g>
        <defs>
          <clipPath id="clip0_1_542">
            <rect fill="white" height="15" width="15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Purchase() {
  return (
    <div className="relative shrink-0 w-full" data-name="Purchase">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-[rgba(181,181,195,0.3)] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center pb-[24px] pt-[12px] px-[12px] relative w-full">
          <BagPlus />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Purchase
          </p>
        </div>
      </div>
    </div>
  );
}

function Basket() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="basket 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g clipPath="url(#clip0_1_532)" id="basket 1">
          <path d={svgPaths.p1a627300} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_532">
            <rect fill="white" height="15" width="15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ManagementUser() {
  return (
    <div className="relative shrink-0 w-full" data-name="Management User">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <Basket />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] w-[124px]" style={{ fontVariationSettings: "'opsz' 14" }}>
            Trade in Transaction
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonFill() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="person-fill 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="person-fill 1">
          <path d={svgPaths.p17a5f680} fill="var(--fill-0, #B5B5C3)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function ManagementUser1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Management User">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <PersonFill />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] w-[110px]" style={{ fontVariationSettings: "'opsz' 14" }}>
            Management User
          </p>
        </div>
      </div>
    </div>
  );
}

function Ethernet() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="ethernet 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_522)" id="ethernet 1">
          <path d={svgPaths.p15b33480} fill="var(--fill-0, #B5B5C3)" id="Vector" />
          <path d={svgPaths.p1735f800} fill="var(--fill-0, #B5B5C3)" id="Vector_2" />
        </g>
        <defs>
          <clipPath id="clip0_1_522">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ManagementUser2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Management User">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <Ethernet />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] w-[110px]" style={{ fontVariationSettings: "'opsz' 14" }}>
            Integrasi
          </p>
        </div>
      </div>
    </div>
  );
}

function Gear() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="gear 3">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g clipPath="url(#clip0_1_518)" id="gear 3">
          <path d={svgPaths.p31616200} fill="var(--fill-0, #B5B5C3)" id="Vector" />
          <path d={svgPaths.p303b5f00} fill="var(--fill-0, #B5B5C3)" id="Vector_2" />
        </g>
        <defs>
          <clipPath id="clip0_1_518">
            <rect fill="white" height="15" width="15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Setting() {
  return (
    <div className="relative shrink-0 w-full" data-name="Setting">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[8px] items-center p-[12px] relative w-full">
          <Gear />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b5b5c3] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
            Setting
          </p>
        </div>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center justify-center relative shrink-0 w-full">
      <Report />
      <Report1 />
      <Purchase />
      <ManagementUser />
      <ManagementUser1 />
      <ManagementUser2 />
      <Setting />
    </div>
  );
}

function Sidebar1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Sidebar 2">
      <Ecommerce1 />
      <Frame14 />
    </div>
  );
}

function SidebarEntraverseAdmin() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[12px] items-start left-0 p-[12px] top-[79px] w-[220px]" data-name="Sidebar Entraverse Admin">
      <Sidebar />
      <Sidebar1 />
    </div>
  );
}

function Thumbnail() {
  return (
    <div className="content-stretch flex flex-col items-start leading-[normal] relative shrink-0 text-[14px] text-white w-[135px]" data-name="Thumbnail">
      <p className="font-['Readex_Pro:SemiBold',sans-serif] font-semibold relative shrink-0 w-[178px]" style={{ fontVariationSettings: "'HEXP' 0" }}>
        Entraverse Supplier
      </p>
      <p className="font-['Readex_Pro:Light',sans-serif] font-light min-w-full relative shrink-0 w-[min-content]" style={{ fontVariationSettings: "'HEXP' 0" }}>
        Admin
      </p>
    </div>
  );
}

function LeftBar() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[209px]" data-name="Left Bar">
      <div className="h-[49px] pointer-events-none relative shrink-0 w-[64px]" data-name="WhatsApp Image 2024-11-11 at 11.55.46 6">
        <div aria-hidden="true" className="absolute inset-0">
          <img alt="" className="absolute max-w-none object-50%-50% object-cover size-full" src={imgWhatsAppImage20241111At1155466} />
          <img alt="" className="absolute max-w-none object-50%-50% object-cover size-full" src={imgWhatsAppImage20241111At1155466} />
          <img alt="" className="absolute max-w-none object-50%-50% object-cover size-full" src={imgWhatsAppImage20241111At1155466} />
          <img alt="" className="absolute max-w-none object-50%-50% object-cover size-full" src={imgWhatsAppImage20241111At1155466} />
          <div className="absolute inset-0 overflow-hidden">
            <img alt="" className="absolute h-[77.08%] left-[-347.77%] max-w-none top-[-183.47%] w-[179.73%]" src={imgWhatsAppImage20241111At1155466} />
          </div>
        </div>
        <div className="absolute inset-0 shadow-[0px_4px_4px_0px_inset_rgba(0,0,0,0.25)]" />
      </div>
      <Thumbnail />
    </div>
  );
}

function NavSearch() {
  return (
    <div className="box-border content-stretch flex items-center justify-between p-[10px] relative rounded-[15px] shrink-0 w-[272px]" data-name="Nav Search">
      <div aria-hidden="true" className="absolute border border-[#f1faff] border-solid inset-0 pointer-events-none rounded-[15px]" />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[14px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        Search
      </p>
      <div className="h-[15.998px] relative shrink-0 w-[16.001px]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
          <path d={svgPaths.p1845da50} fill="var(--fill-0, white)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function FlagMc() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="flag/MC">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_505)" id="flag/MC">
          <mask height="20" id="mask0_1_505" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="20" x="0" y="0">
            <circle cx="10" cy="10" fill="var(--fill-0, #D9D9D9)" id="Ellipse 53" r="10" />
          </mask>
          <g mask="url(#mask0_1_505)">
            <path d={svgPaths.p14886d00} fill="var(--fill-0, white)" id="Vector" />
            <path d={svgPaths.p29828380} fill="var(--fill-0, #C70000)" id="Vector_2" />
          </g>
        </g>
        <defs>
          <clipPath id="clip0_1_505">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-[#f1faff] box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[5px] relative rounded-[2px] shrink-0 w-[28px]">
      <p className="font-['DM_Sans:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#3120ee] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        F
      </p>
    </div>
  );
}

function RightBar() {
  return (
    <div className="content-stretch flex gap-[22px] items-center relative shrink-0" data-name="Right Bar">
      <NavSearch />
      <FlagMc />
      <Frame />
    </div>
  );
}

function Frame1() {
  return (
    <div className="box-border content-stretch flex items-center justify-between px-[10px] py-0 relative shrink-0 w-[1401px]">
      <LeftBar />
      <RightBar />
    </div>
  );
}

function Navbar() {
  return (
    <div className="absolute bg-[#1e1e2d] box-border content-stretch flex flex-col gap-[10px] items-start left-0 px-0 py-[15px] top-0 w-[1440px]" data-name="Navbar">
      <Frame1 />
    </div>
  );
}

function ButtonEdit() {
  return (
    <div className="absolute bg-[#75a6ff] box-border content-stretch flex gap-[10px] items-center justify-center left-[1285px] px-[16px] py-[8px] rounded-[5px] top-[99px]" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#e8ecf4] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        +Tambah Produk
      </p>
    </div>
  );
}

function ButtonEdit1() {
  return (
    <div className="absolute bg-[#75a6ff] box-border content-stretch flex gap-[10px] items-center justify-center left-[1118px] px-[16px] py-[8px] rounded-[5px] top-[99px]" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#e8ecf4] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        Sync from Mekari Jurnal
      </p>
    </div>
  );
}

function NavSearch1() {
  return (
    <div className="absolute bg-[#f3f6f9] box-border content-stretch flex items-center justify-between left-[20px] p-[10px] rounded-[5px] top-[20px] w-[128px]" data-name="Nav Search">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#b5b5c3] text-[14px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        Search
      </p>
      <div className="h-[15.998px] relative shrink-0 w-[16.001px]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
          <path d={svgPaths.p1845da50} fill="var(--fill-0, #181C32)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Nama() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[51px] p-[12px] top-[78px] w-[570px]" data-name="Nama">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        Nama
      </p>
    </div>
  );
}

function Nama1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[51px] px-[12px] py-[24px] top-[118px] w-[570px]" data-name="Nama">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        Meta Quest 3S 128 GB 256 GB Virtual Reality Headset
      </p>
    </div>
  );
}

function Nama2() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[51px] px-[12px] py-[24px] top-[182px] w-[570px]" data-name="Nama">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        Meta Quest 3S 128 GB 256 GB Virtual Reality Headset
      </p>
    </div>
  );
}

function Nama3() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[51px] px-[12px] py-[24px] top-[246px] w-[570px]" data-name="Nama">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        Meta Quest 3S 128 GB 256 GB Virtual Reality Headset
      </p>
    </div>
  );
}

function Nama4() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[51px] px-[12px] py-[24px] top-[310px] w-[570px]" data-name="Nama">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        Meta Quest 3S 128 GB 256 GB Virtual Reality Headset
      </p>
    </div>
  );
}

function Nama5() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[51px] px-[12px] py-[24px] top-[374px] w-[570px]" data-name="Nama">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        Meta Quest 3S 128 GB 256 GB Virtual Reality Headset
      </p>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents left-[51px] top-[78px]">
      <Nama />
      <Nama1 />
      <Nama2 />
      <Nama3 />
      <Nama4 />
      <Nama5 />
    </div>
  );
}

function Nomor() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[20px] p-[12px] top-[118px] w-[31px]" data-name="Nomor">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        1
      </p>
    </div>
  );
}

function Nomor1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[20px] p-[12px] top-[182px] w-[31px]" data-name="Nomor">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        1
      </p>
    </div>
  );
}

function Nomor2() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[20px] p-[12px] top-[246px] w-[31px]" data-name="Nomor">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        1
      </p>
    </div>
  );
}

function Nomor3() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[20px] p-[12px] top-[310px] w-[31px]" data-name="Nomor">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        1
      </p>
    </div>
  );
}

function Nomor4() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[20px] p-[12px] top-[374px] w-[31px]" data-name="Nomor">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        1
      </p>
    </div>
  );
}

function Nomor5() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[20px] p-[12px] top-[78px] w-[31px]" data-name="Nomor">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        #
      </p>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents left-[20px] top-[78px]">
      <Nomor />
      <Nomor1 />
      <Nomor2 />
      <Nomor3 />
      <Nomor4 />
      <Nomor5 />
    </div>
  );
}

function Photo() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[621px] p-[12px] top-[78px] w-[90px]" data-name="Photo">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-[38px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        Photo
      </p>
    </div>
  );
}

function FileEarmarkImage() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="file-earmark-image 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="file-earmark-image 1">
          <path d={svgPaths.p9164d00} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p3230580} fill="var(--fill-0, black)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0">
      <FileEarmarkImage />
    </div>
  );
}

function Photo1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[621px] px-[12px] py-[24px] top-[118px] w-[90px]" data-name="Photo">
      <Frame2 />
    </div>
  );
}

function FileEarmarkImage1() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="file-earmark-image 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="file-earmark-image 1">
          <path d={svgPaths.p9164d00} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p3230580} fill="var(--fill-0, black)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0">
      <FileEarmarkImage1 />
    </div>
  );
}

function Photo2() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[621px] px-[12px] py-[24px] top-[182px] w-[90px]" data-name="Photo">
      <Frame3 />
    </div>
  );
}

function FileEarmarkImage2() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="file-earmark-image 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="file-earmark-image 1">
          <path d={svgPaths.p9164d00} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p3230580} fill="var(--fill-0, black)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0">
      <FileEarmarkImage2 />
    </div>
  );
}

function Photo3() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[621px] px-[12px] py-[24px] top-[246px] w-[90px]" data-name="Photo">
      <Frame4 />
    </div>
  );
}

function FileEarmarkImage3() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="file-earmark-image 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="file-earmark-image 1">
          <path d={svgPaths.p9164d00} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p3230580} fill="var(--fill-0, black)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0">
      <FileEarmarkImage3 />
    </div>
  );
}

function Photo4() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[621px] px-[12px] py-[24px] top-[310px] w-[90px]" data-name="Photo">
      <Frame5 />
    </div>
  );
}

function FileEarmarkImage4() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="file-earmark-image 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="file-earmark-image 1">
          <path d={svgPaths.p9164d00} fill="var(--fill-0, black)" id="Vector" />
          <path d={svgPaths.p3230580} fill="var(--fill-0, black)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0">
      <FileEarmarkImage4 />
    </div>
  );
}

function Photo5() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[621px] px-[12px] py-[24px] top-[374px] w-[90px]" data-name="Photo">
      <Frame6 />
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute contents left-[621px] top-[78px]">
      <Photo />
      <Photo1 />
      <Photo2 />
      <Photo3 />
      <Photo4 />
      <Photo5 />
    </div>
  );
}

function Link() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[711px] p-[12px] top-[78px] w-[118px]" data-name="Link">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-[26px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        Link
      </p>
    </div>
  );
}

function ButtonEdit2() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[711px] px-[12px] py-[16px] top-[118px] w-[118px]" data-name="Link">
      <ButtonEdit2 />
    </div>
  );
}

function ButtonEdit3() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link2() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[711px] px-[12px] py-[16px] top-[182px] w-[118px]" data-name="Link">
      <ButtonEdit3 />
    </div>
  );
}

function ButtonEdit4() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link3() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[711px] px-[12px] py-[16px] top-[246px] w-[118px]" data-name="Link">
      <ButtonEdit4 />
    </div>
  );
}

function ButtonEdit5() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link4() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[711px] px-[12px] py-[16px] top-[310px] w-[118px]" data-name="Link">
      <ButtonEdit5 />
    </div>
  );
}

function ButtonEdit6() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link5() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[711px] px-[12px] py-[16px] top-[374px] w-[118px]" data-name="Link">
      <ButtonEdit6 />
    </div>
  );
}

function Link6() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[39.237px] items-center justify-center left-[722px] p-[12px] top-[78px] w-[118px]" data-name="Link">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-[26px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        Link
      </p>
    </div>
  );
}

function ButtonEdit7() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link7() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[62.779px] items-center justify-center left-[722px] px-[12px] py-[16px] top-[117.24px] w-[118px]" data-name="Link">
      <ButtonEdit7 />
    </div>
  );
}

function ButtonEdit8() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link8() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[62.779px] items-center justify-center left-[722px] px-[12px] py-[16px] top-[180.02px] w-[118px]" data-name="Link">
      <ButtonEdit8 />
    </div>
  );
}

function ButtonEdit9() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link9() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[62.779px] items-center justify-center left-[722px] px-[12px] py-[16px] top-[242.8px] w-[118px]" data-name="Link">
      <ButtonEdit9 />
    </div>
  );
}

function ButtonEdit10() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link10() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[62.779px] items-center justify-center left-[722px] px-[12px] py-[16px] top-[305.57px] w-[118px]" data-name="Link">
      <ButtonEdit10 />
    </div>
  );
}

function ButtonEdit11() {
  return (
    <div className="bg-[rgba(181,181,195,0.6)] box-border content-stretch flex gap-[10px] items-center justify-center px-[16px] py-[8px] relative rounded-[5px] shrink-0" data-name="Button edit">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        View
      </p>
    </div>
  );
}

function Link11() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[62.779px] items-center justify-center left-[722px] px-[12px] py-[16px] top-[375.22px] w-[118px]" data-name="Link">
      <ButtonEdit11 />
    </div>
  );
}

function Group8() {
  return (
    <div className="absolute contents left-[722px] top-[78px]">
      <Link6 />
      <Link7 />
      <Link8 />
      <Link9 />
      <Link10 />
      <Link11 />
    </div>
  );
}

function TradeIn() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center left-[937px] p-[12px] top-[78px] w-[106px]" data-name="Trade in">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-[38px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        Status
      </p>
    </div>
  );
}

function TradeIn1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[937px] px-0 py-[22px] top-[118px] w-[106px]" data-name="Trade in">
      <div className="relative shrink-0 size-[20px]" data-name="image 83">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImage83} />
      </div>
    </div>
  );
}

function TradeIn2() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[937px] px-0 py-[22px] top-[182px] w-[106px]" data-name="Trade in">
      <div className="relative shrink-0 size-[20px]" data-name="image 83">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImage83} />
      </div>
    </div>
  );
}

function TradeIn3() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[937px] px-0 py-[22px] top-[246px] w-[106px]" data-name="Trade in">
      <div className="relative shrink-0 size-[20px]" data-name="image 83">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImage83} />
      </div>
    </div>
  );
}

function TradeIn4() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[937px] px-0 py-[22px] top-[310px] w-[106px]" data-name="Trade in">
      <div className="relative shrink-0 size-[20px]" data-name="image 83">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImage83} />
      </div>
    </div>
  );
}

function TradeIn5() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[937px] px-0 py-[22px] top-[374px] w-[106px]" data-name="Trade in">
      <div className="relative shrink-0 size-[20px]" data-name="image 83">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImage83} />
      </div>
    </div>
  );
}

function TradeIn6() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[40px] items-center justify-center left-[851px] p-[12px] top-[78px] w-[97px]" data-name="Trade in">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#7e8299] text-[12px] w-[48px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        Trade In
      </p>
    </div>
  );
}

function ButtonTrade() {
  return (
    <div className="h-[24px] relative shrink-0 w-[48px]" data-name="Button Trade">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 24">
        <g id="Button Trade">
          <rect fill="var(--fill-0, #B5B5C3)" height="24" id="Rectangle 435" rx="12" width="48" />
          <circle cx="14" cy="12" fill="var(--fill-0, #FCFCFC)" id="Ellipse 61" r="9" />
        </g>
      </svg>
    </div>
  );
}

function TradeIn7() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[851px] px-0 py-[22px] top-[118px] w-[97px]" data-name="Trade in">
      <ButtonTrade />
    </div>
  );
}

function ButtonTrade1() {
  return (
    <div className="h-[24px] relative shrink-0 w-[48px]" data-name="Button Trade">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 24">
        <g id="Button Trade">
          <rect fill="var(--fill-0, #B5B5C3)" height="24" id="Rectangle 435" rx="12" width="48" />
          <circle cx="14" cy="12" fill="var(--fill-0, #FCFCFC)" id="Ellipse 61" r="9" />
        </g>
      </svg>
    </div>
  );
}

function TradeIn8() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[851px] px-0 py-[22px] top-[182px] w-[97px]" data-name="Trade in">
      <ButtonTrade1 />
    </div>
  );
}

function ButtonTrade2() {
  return (
    <div className="h-[24px] relative shrink-0 w-[48px]" data-name="Button Trade">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 24">
        <g id="Button Trade">
          <rect fill="var(--fill-0, #B5B5C3)" height="24" id="Rectangle 435" rx="12" width="48" />
          <circle cx="14" cy="12" fill="var(--fill-0, #FCFCFC)" id="Ellipse 61" r="9" />
        </g>
      </svg>
    </div>
  );
}

function TradeIn9() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[851px] px-0 py-[22px] top-[246px] w-[97px]" data-name="Trade in">
      <ButtonTrade2 />
    </div>
  );
}

function ButtonTrade3() {
  return (
    <div className="h-[24px] relative shrink-0 w-[48px]" data-name="Button Trade">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 24">
        <g id="Button Trade">
          <rect fill="var(--fill-0, #B5B5C3)" height="24" id="Rectangle 435" rx="12" width="48" />
          <circle cx="14" cy="12" fill="var(--fill-0, #FCFCFC)" id="Ellipse 61" r="9" />
        </g>
      </svg>
    </div>
  );
}

function TradeIn10() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[851px] px-0 py-[22px] top-[310px] w-[97px]" data-name="Trade in">
      <ButtonTrade3 />
    </div>
  );
}

function ButtonTrade4() {
  return (
    <div className="h-[24px] relative shrink-0 w-[48px]" data-name="Button Trade">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 24">
        <g id="Button Trade">
          <rect fill="var(--fill-0, #B5B5C3)" height="24" id="Rectangle 435" rx="12" width="48" />
          <circle cx="14" cy="12" fill="var(--fill-0, #FCFCFC)" id="Ellipse 61" r="9" />
        </g>
      </svg>
    </div>
  );
}

function TradeIn11() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col gap-[10px] h-[64px] items-center justify-center left-[851px] px-0 py-[22px] top-[374px] w-[97px]" data-name="Trade in">
      <ButtonTrade4 />
    </div>
  );
}

function Group9() {
  return (
    <div className="absolute contents left-[851px] top-[78px]">
      <TradeIn6 />
      <TradeIn7 />
      <TradeIn8 />
      <TradeIn9 />
      <TradeIn10 />
      <TradeIn11 />
    </div>
  );
}

function PencilFill() {
  return (
    <div className="relative shrink-0 size-[17px]" data-name="pencil-fill (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
        <g clipPath="url(#clip0_1_492)" id="pencil-fill (1) 1">
          <path d={svgPaths.p18c56280} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_492">
            <rect fill="white" height="17" width="17" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Link12() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[30px]" data-name="Link">
      <PencilFill />
    </div>
  );
}

function Trash() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="trash3 (3) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="trash3 (3) 1">
          <path d={svgPaths.p18c27800} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Link13() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[63px]" data-name="Link">
      <Trash />
    </div>
  );
}

function Frame15() {
  return (
    <div className="absolute content-stretch flex h-[64px] items-center justify-between left-[1043px] top-[118px] w-[93px]">
      <Link12 />
      <Link13 />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-[1043px] top-[118px]">
      <Frame15 />
    </div>
  );
}

function PencilFill1() {
  return (
    <div className="relative shrink-0 size-[17px]" data-name="pencil-fill (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
        <g clipPath="url(#clip0_1_492)" id="pencil-fill (1) 1">
          <path d={svgPaths.p18c56280} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_492">
            <rect fill="white" height="17" width="17" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Link14() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[30px]" data-name="Link">
      <PencilFill1 />
    </div>
  );
}

function Trash1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="trash3 (3) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="trash3 (3) 1">
          <path d={svgPaths.p18c27800} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Link15() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[63px]" data-name="Link">
      <Trash1 />
    </div>
  );
}

function Frame16() {
  return (
    <div className="absolute content-stretch flex h-[64px] items-center justify-between left-[1043px] top-[246px] w-[93px]">
      <Link14 />
      <Link15 />
    </div>
  );
}

function Group4() {
  return (
    <div className="absolute contents left-[1043px] top-[246px]">
      <Frame16 />
    </div>
  );
}

function PencilFill2() {
  return (
    <div className="relative shrink-0 size-[17px]" data-name="pencil-fill (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
        <g clipPath="url(#clip0_1_492)" id="pencil-fill (1) 1">
          <path d={svgPaths.p18c56280} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_492">
            <rect fill="white" height="17" width="17" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Link16() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[30px]" data-name="Link">
      <PencilFill2 />
    </div>
  );
}

function Trash2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="trash3 (3) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="trash3 (3) 1">
          <path d={svgPaths.p18c27800} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Link17() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[63px]" data-name="Link">
      <Trash2 />
    </div>
  );
}

function Frame17() {
  return (
    <div className="absolute content-stretch flex h-[64px] items-center justify-between left-[1043px] top-[310px] w-[93px]">
      <Link16 />
      <Link17 />
    </div>
  );
}

function Group6() {
  return (
    <div className="absolute contents left-[1043px] top-[310px]">
      <Frame17 />
    </div>
  );
}

function PencilFill3() {
  return (
    <div className="relative shrink-0 size-[17px]" data-name="pencil-fill (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
        <g clipPath="url(#clip0_1_492)" id="pencil-fill (1) 1">
          <path d={svgPaths.p18c56280} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_492">
            <rect fill="white" height="17" width="17" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Link18() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[30px]" data-name="Link">
      <PencilFill3 />
    </div>
  );
}

function Trash3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="trash3 (3) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="trash3 (3) 1">
          <path d={svgPaths.p18c27800} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Link19() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[63px]" data-name="Link">
      <Trash3 />
    </div>
  );
}

function Frame18() {
  return (
    <div className="absolute content-stretch flex h-[64px] items-center justify-between left-[1043px] top-[374px] w-[93px]">
      <Link18 />
      <Link19 />
    </div>
  );
}

function Group7() {
  return (
    <div className="absolute contents left-[1043px] top-[374px]">
      <Frame18 />
    </div>
  );
}

function PencilFill4() {
  return (
    <div className="relative shrink-0 size-[17px]" data-name="pencil-fill (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
        <g clipPath="url(#clip0_1_492)" id="pencil-fill (1) 1">
          <path d={svgPaths.p18c56280} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_492">
            <rect fill="white" height="17" width="17" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Link20() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[30px]" data-name="Link">
      <PencilFill4 />
    </div>
  );
}

function Trash4() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="trash3 (3) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="trash3 (3) 1">
          <path d={svgPaths.p18c27800} fill="var(--fill-0, #7E8299)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Link21() {
  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[16px] relative shrink-0 w-[63px]" data-name="Link">
      <Trash4 />
    </div>
  );
}

function Frame19() {
  return (
    <div className="absolute content-stretch flex h-[64px] items-center justify-between left-[1043px] top-[182px] w-[93px]">
      <Link20 />
      <Link21 />
    </div>
  );
}

function Group5() {
  return (
    <div className="absolute contents left-[1043px] top-[182px]">
      <Frame19 />
    </div>
  );
}

function ChevronDown() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="chevron-down (1) 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="chevron-down (1) 1">
          <path clipRule="evenodd" d={svgPaths.p16305100} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-[rgba(126,130,153,0.2)] box-border content-stretch flex items-center justify-between px-[10px] py-[7px] relative rounded-[5px] shrink-0 w-[69px]">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#1e1e2d] text-[12px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        5
      </p>
      <ChevronDown />
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[14px] items-center relative shrink-0">
      <Frame7 />
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#181c32] text-[13px] text-nowrap whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>
        Showing 1 to 5 of 16 records
      </p>
    </div>
  );
}

function ChevronRight1() {
  return (
    <div className="relative size-[15px]" data-name="chevron-right 2">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="chevron-right 2">
          <path clipRule="evenodd" d={svgPaths.p363aa400} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame9() {
  return (
    <div className="bg-[#3577f0] box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[5px] relative rounded-[4px] shrink-0 w-[25px]">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#f9f9f9] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        1
      </p>
    </div>
  );
}

function Frame10() {
  return (
    <div className="bg-[#e4e8eb] box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[10px] py-[5px] relative rounded-[4px] shrink-0 w-[29px]">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#181c32] text-[14px] w-full" style={{ fontVariationSettings: "'opsz' 14" }}>
        2
      </p>
    </div>
  );
}

function ChevronRight() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="chevron-right 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
        <g id="chevron-right 1">
          <path clipRule="evenodd" d={svgPaths.pcefcf00} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[124px]">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none rotate-[180deg]">
          <ChevronRight1 />
        </div>
      </div>
      <Frame9 />
      <Frame10 />
      <ChevronRight />
    </div>
  );
}

function Frame12() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[32px] top-[460px] w-[1104px]">
      <Frame8 />
      <Frame11 />
    </div>
  );
}

function Frame20() {
  return (
    <div className="absolute bg-white h-[517px] left-[248px] overflow-clip rounded-[10px] top-[161px] w-[1165px]">
      <NavSearch1 />
      <Group1 />
      <Group2 />
      <Group3 />
      <Link />
      <Link1 />
      <Link2 />
      <Link3 />
      <Link4 />
      <Link5 />
      <Group8 />
      <TradeIn />
      <TradeIn1 />
      <TradeIn2 />
      <TradeIn3 />
      <TradeIn4 />
      <TradeIn5 />
      <Group9 />
      <Group />
      <Group4 />
      <Group6 />
      <Group7 />
      <Group5 />
      <Frame12 />
    </div>
  );
}

export default function EntraverseSupplierProduk() {
  return (
    <div className="bg-[#e4e8eb] relative size-full" data-name="Entraverse Supplier (Produk)">
      <p className="absolute font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[normal] left-[248px] text-[#181c32] text-[18px] text-nowrap top-[103px] whitespace-pre" style={{ fontVariationSettings: "'opsz' 14" }}>{`Produk `}</p>
      <SidebarEntraverseAdmin />
      <Navbar />
      <ButtonEdit />
      <ButtonEdit1 />
      <Frame20 />
    </div>
  );
}