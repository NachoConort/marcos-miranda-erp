import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { productosService } from "@/services/productos.service";
import { ArrowLeft } from "lucide-react";
import ProductoForm from "./ProductoForm";

export default function EditarProductoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["producto", id],
    queryFn: () => productosService.getById(id),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      representaciones: [],
      moneda: "pesos",
      porcentajeIva: 21,
      stockeable: false,
      cantidadDisponible: 0,
      habilitado: true,
      costo: 0,
    },
  });

  useEffect(() => {
    if (!data?.producto) return;
    const p = data.producto;
    reset({
      codigo: p.codigo,
      codigoBarra: p.codigoBarra,
      nombre: p.nombre,
      descripcion: p.descripcion,
      rubro: p.rubro,
      subRubro: p.subRubro,
      tipoProducto: p.tipoProducto,
      representaciones: p.representaciones?.map((r) => r._id || r) || [],
      costo: p.costo,
      moneda: p.moneda,
      porcentajeIva: p.porcentajeIva,
      unidadMedida: p.unidadMedida,
      stockeable: p.stockeable,
      cantidadDisponible: p.cantidadDisponible,
      disponiblePara: p.disponiblePara || [],
      habilitado: p.habilitado,
      marca: p.marca?._id || p.marca || "",
      aceptaStockNegativo: p.aceptaStockNegativo || false,
    });
  }, [data, reset]);

  const { mutate: editar, isPending } = useMutation({
    mutationFn: (formData) => productosService.editar(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(["productos"]);
      navigate("/productos");
    },
    onError: (err) => alert(err.response?.data?.message || "Error al guardar"),
  });

  if (isLoading)
    return <div className="p-6 text-sm text-gray-400">Cargando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/productos")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Editar producto
          </h2>
          <p className="text-sm text-gray-500">{data?.producto?.nombre}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => editar(d))}>
        <ProductoForm
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />

        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={() => navigate("/productos")}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
